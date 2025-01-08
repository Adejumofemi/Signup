import validator from "validator";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken'
import crypto from "crypto";
import userModel from "../models/userModel.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import  {sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail, sendWelcomeEmail}  from "../mailtrap/email.js";


const generateVerificationToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a six-digit code
};

// Route for user login 
const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if(!email || !password ){
            return res.json({ success: false, message: "All fields are required" })
        }

        if (!user) {
            return res.json({ success: false, message: "User doesn't exists" })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {

            const token = generateTokenAndSetCookie(user._id);

            user.lastLogin = new Date();
            
            await user.save();

            res.status(200).json({ success: true, token, message: "Logged in successfully", user: {
                ...user._doc,
                password: undefined,
            } })

        }
        else {
            res.json({ success: false, message: 'Invalid email or password' })
        }

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message })
    }
}
 
// Route for user register
const registerUser = async (req, res) => {
    try {  

        const { name, email, password } = req.body;

        if(!email || !password || !name){
            throw new Error("All fields are required");
        }

        // checking user already exists or not
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" })
        }

        // validating email format & strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.json({ success: false, message: "The password does not meet requirements." })
        }


        // hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const verificationToken = generateVerificationToken();

        const user = new userModel({
            name,
            email,
            password: hashedPassword,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000
        })

        await user.save()

        

        await sendVerificationEmail(user.email, verificationToken);

        res.json({ success: true, message: "Account Created Successfully",  user:{
            ...user._doc,
            password: undefined
        }

        })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for email verification
const verifyEmail = async (req, res) => {
    const {code} = req.body;
    try {
        const user = await userModel.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: {$gt: Date.now()}
        })

        if(!user){
            return res.status(400).json({success: false, message: "Invalid  or expired verification code"})
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        const token = generateTokenAndSetCookie(user._id);

        await sendWelcomeEmail(user.email, user.name);
        res.status(200).json({
            success: true,
            message: "Email verifed successfully",
            token,
            user: {
                ...user._doc,
                password: undefined,
            }
        })

    } catch (error) {
        console.log(error)
        res.status(400).json({
            success: false,
            message: "Server error"
        });
    }
}

// Route for forgot password

const forgotPassword = async (req, res) => {
    const {email} = req.body;

    try {
        const user = await userModel.findOne({email});
        if(!user){
            return res.status(400).json({success: false, message: "User not found"});
        }
        
        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();

        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/api/user/reset-password/${resetToken}"`);
        res.status(200).json({success: true, message: "Passwork Reset link send to your email"});
    } catch (error) {
        console.log("Error in forgot password", error);
        res.status(400).json({success: false, message: error.message});
        
    }
}
 
// Route for reset Password
const resetPassword = async (req, res) => {
    try {
        const {token} = req.params;
        const {password} = req.body;

        const user = await userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: {$gt: Date.now()},
        });

        if(!user){
            res.status(400).json({success: false, message: "Invalid or expired reset token"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;

        await user.save();

        await sendResetSuccessEmail(user.email);
        res.status(200).json({success: true, message: "Password reset successful"});
    } catch (error) {
        console.log("Error in reset password", error);
        res.status(400).json({success: false, message:  error.message});
    }
}

const profile = async (req, res) => {

    await userModel.findOne(req.user_id)
    .then(users => {res.json(users)})
    .catch(err => res.json(err))

}

//Route for Auth
const checkAuth = async (req, res) => {
	try {
		const user = await userModel.findById(req.userId).select("-password");
		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		res.status(200).json({ success: true, user });
	} catch (error) {
		console.log("Error in checkAuth ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

// Route for admin login
const adminLogin = async (req, res) => {
    try {
        
        const {email,password} = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})
        } else {
            res.json({success:false,message:"Invalid credentials"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const resendCode = async (req, res) => {
    const { email } = req.body;

    try { 
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const verificationToken = user.verificationToken;

        if (!verificationToken) {
            return res.status(400).json({ success: false, message: 'Verification token not found' });
        }

        await sendVerificationEmail(user.email, verificationToken);

        res.json({ success: true, message: 'OTP resent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}; 




export { loginUser, registerUser, adminLogin, verifyEmail, forgotPassword, resetPassword, checkAuth, profile, resendCode}
