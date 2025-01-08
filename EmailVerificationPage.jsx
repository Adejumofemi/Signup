import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {motion} from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { toast } from 'react-toastify'
import { ShopContext } from "../context/ShopContext";
import axios from 'axios';



const EmailVerificationPage = () => {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
	const [isResendDisabled, setIsResendDisabled] = useState(true);
	const [countdown, setCountdown] = useState(15);
    const inputRefs = useRef([]);
    const location = useLocation();
	const navigate = useNavigate();
	const email = location.state?.email;

    const { error, isLoading, verifyEmail } = useAuthStore();
	const { token, setToken, backendUrl } = useContext(ShopContext)

    const handleChange = (index, value) =>{
        const newCode = [...code];
 
        // Handle pasted content
		if (value.length > 1) {
			const pastedCode = value.slice(0, 6).split("");
			for (let i = 0; i < 6; i++) {
				newCode[i] = pastedCode[i] || "";
			}
			setCode(newCode);

			// Focus on the last non-empty input or the first empty one
			const lastFilledIndex = newCode.findLastIndex((digit) => digit !== "");
			const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
			inputRefs.current[focusIndex].focus();
		} else {
			newCode[index] = value;
			setCode(newCode);

			// Move focus to the next input field if value is entered
			if (value && index < 5) {
				inputRefs.current[index + 1].focus();
			}
		}
    }

    const handleKeyDown = (index, e) =>{
        if (e.key === "Backspace" && !code[index] && index > 0) {
			inputRefs.current[index - 1].focus();
		}
    }

    const handleSubmit = async (e) => {
		e.preventDefault();
		const verificationCode = code.join("");
		try {
			const response = await verifyEmail(verificationCode);
			setToken(response.token)
			localStorage.setItem('token',response.token)
			navigate("/");
			toast.success("Email verified successfully");
		} catch (error) {
			console.log(error);
		}
	};

	const resendOtp = async (email) => {
        try {
            const response = await axios.post(backendUrl + '/api/user/resend-otp', { email });
            return response.data;
        } catch (error) {
			if (error.response && error.response.data) {
                throw new Error(error.response.data.message || 'An unexpected error occurred');
            } else {
                throw new Error('An unexpected error occurred');
            }
        }
    };

    const handleResendOtp = async () => {
        try {
            const response = await resendOtp(email);
            toast.success(response.message);
			setIsResendDisabled(true);
            setCountdown(15);
			const timer = setInterval(() => {
                setCountdown((prevCountdown) => {
                    if (prevCountdown <= 1) {
                        clearInterval(timer);
                        setIsResendDisabled(false);
                        return 0;
                    }
                    return prevCountdown - 1;
                });
            }, 1000);
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Auto submit when all fields are filled
	useEffect(() => {
		if (code.every((digit) => digit !== "")) {
			handleSubmit(new Event("submit"));
		}
	}, [code]);

	useEffect(()=>{
		if (token) {
			navigate('/')
		}
	  },[token]);

	  useEffect(() => {
        setIsResendDisabled(true);
        setCountdown(15);
        const timer = setInterval(() => {
            setCountdown((prevCountdown) => {
                if (prevCountdown <= 1) {
                    clearInterval(timer);
                    setIsResendDisabled(false);
                    return 0;
                }
                return prevCountdown - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

	  if (!email) {
        toast.error("Email is undefined");
        return null; // or handle this case appropriately
    }

    return <div className='max-w-md mt-14 flex flex-col w-[90%] sm:max-w-96 m-auto bg-gray-80 overflow-hidden'>

        
        <h2 className='text-3xl font-bold mb-6 text-center bg-gradient-to-r from-black to-black text-transparent bg-clip-text'>
					Verify Your Email
				</h2>
				<p className='text-center text-gray-400 mb-6'>Enter the 6-digit code sent to your email address.</p>

                <form onSubmit={handleSubmit} className='space-y-6'>
					<div className='flex justify-between'>
						{code.map((digit, index) => (
							<input
								key={index}
								ref={(el) => (inputRefs.current[index] = el)}
								type='text'
								maxLength='6'
								value={digit}
								onChange={(e) => handleChange(index, e.target.value)}
								onKeyDown={(e) => handleKeyDown(index, e)}
								className='w-12 h-12 text-center text-2xl font-bold bg-white text-black border-2 border-gray-600 rounded-lg focus:border-pink-400 focus:outline-none'
							/>
						))}
					</div>
					{error && <p className='text-red-500 font-semibold mt-2'>{error}</p>}
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						type='submit'
						disabled={isLoading || code.some((digit) => !digit)}
						className='w-full bg-black text-white font-bold py-3 px-4 shadow-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50 disabled:opacity-50'
					>
						{isLoading ? "Verifying..." : "Verify Email"}
					</motion.button>

					<div className='flex items-center justify-center mt-4'>
                    <button type="button" onClick={handleResendOtp} disabled={isResendDisabled || isLoading} className={`text-base p-2 rounded ${isResendDisabled ? 'bg-gray-300 text-gray-500' : 'text-black underline'}`}>
                        {isResendDisabled ? `Resend Code (${countdown}s)` : 'Resend Code'}
                    </button>
                </div>
				</form>

    </div>
};
export default EmailVerificationPage;
