import { motion } from "framer-motion";
import { Loader, Lock, Mail, User, Eye, EyeOff } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import Input from "../components/Input";
import { Link } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import axios from 'axios';
import { toast } from 'react-toastify';
import EmailVerificationPage from './EmailVerificationPage';



const SignUpPage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [isSignedUp, setIsSignedUp] = useState(false); 
	const {navigate, backendUrl } = useContext(ShopContext) 
	const [isLoading, setLoading] = useState(false);

	    useEffect(() => {
        // Clear previous user details when the component mounts
        setName("");
        setEmail("");
        setPassword("");
        setError("");
        setIsSignedUp(false);
    }, []);

    const handleSignUp = async (e) => {
		e.preventDefault();

		setLoading(true)
		setError("");

		
		try {
			const response = await axios.post(backendUrl + '/api/user/register',{name,email,password})
			if (response.data.success) {
				setLoading(true)
				navigate('/verify-email', { state: { email } })
				setIsSignedUp(true);
				toast.success("Verification OTP Sent to Email")
			  } else {
				setLoading(false)
				setError(response.data.message); // Set error message
			  }
		} catch (error) {
			setLoading(false)
			setError(response.data.message); // Set error message
		}
	};

	if (isSignedUp) {
        return <EmailVerificationPage email={email} />;
    }

    return <motion.div
    initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className='max-w-md mt-14 flex flex-col w-[90%] sm:max-w-96 m-auto   bg-opacity-50  
			overflow-hidden' 
    >
        <div className='p-8'>
				<h2 className='text-3xl font-bold mb-6 text-center bg-black  to-emerald-500 text-transparent bg-clip-text'>
					Create Account
				</h2>

				<form onSubmit={handleSignUp}>
					<Input
						icon={User}
						type='text'
						placeholder='Full Name'
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
					<Input
						icon={Mail}
						type='email'
						placeholder='Email Address'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<div className="relative">
					<Input
						icon={Lock}
						type={showPassword ? 'text' : 'password'}
						placeholder='Password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					<button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </button>
					</div>
					{error && <p className='text-red-500 font-semibold mt-2'>{error}</p>}
					<PasswordStrengthMeter password={password} />

					<motion.button
						className='mt-5 w-full bg-black text-white font-bold py-3 px-4 shadow-lg hover:from-black
						hover:to-emerald-700 focus:outline-none focus:ring-1 focus:ring-black focus:ring-offset-2
						 focus:ring-offset-gray-900 transition duration-200'
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						type='submit'
						disabled={isLoading}
					>
						{isLoading ? <Loader className=' animate-spin mx-auto' size={24} /> : "Sign Up"}
					</motion.button>
				</form>
			</div>
            <div className='px-8  bg-opacity-50 flex justify-center'>
				<p className='text-sm text-gray-400'>
					Already have an account?{" "}
					<Link to={"/login"} className='text-black hover:underline'>
						Login
					</Link>
				</p>
			</div>
    </motion.div>
}

export default SignUpPage
