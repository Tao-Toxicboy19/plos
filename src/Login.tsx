import { useForm } from 'react-hook-form'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

type FormData = {
  email: string
  password: string
}

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>()
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/') // ถ้าล็อกอินอยู่แล้ว ให้ redirect ไปที่หน้า root (/)
      }
    })
    return () => unsubscribe()
  }, [navigate])

  const onSubmit = async (data: FormData) => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password)
      navigate('/') // เมื่อ login สำเร็จ redirect ไปหน้า root (/)
    } catch (error) {
      console.error('Error logging in:', error)
    }
  }

  return (
    <div className='min-h-screen flex flex-col justify-center items-center bg-gray-100'>
      <div className='w-full max-w-md bg-white p-8 rounded-lg shadow-md'>
        <div className='flex items-center justify-center'>
          <img
            className='object-cover h-24'
            src='https://eng.ksu.ac.th/home/wp-content/uploads/2023/09/EN-KSU-Logo_Eng-color.png'
            alt='logo'
          />
        </div>
          <h2 className='text-2xl font-semibold text-center mb-6'>Login</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Email Field */}
          <div className='mb-4'>
            <label className='block text-gray-700 text-sm font-bold mb-2'>
              Email
            </label>
            <input
              type='email'
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.email ? 'border-red-500' : ''
              }`}
              placeholder='Enter your email'
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && (
              <p className='text-red-500 text-xs italic mt-1'>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className='mb-4'>
            <label className='block text-gray-700 text-sm font-bold mb-2'>
              Password
            </label>
            <input
              type='password'
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.password ? 'border-red-500' : ''
              }`}
              placeholder='Enter your password'
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
            {errors.password && (
              <p className='text-red-500 text-xs italic mt-1'>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className='flex items-center justify-between'>
            <button
              type='submit'
              className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
            >
              Login
            </button>
          </div>
        </form>

        {/* Forgot Password */}
        <div className='mt-4 text-center'>
          <a href='#' className='text-blue-500 hover:text-blue-700 text-sm'>
            Forgot your password?
          </a>
        </div>
      </div>
    </div>
  )
}
