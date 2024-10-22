import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { auth, database } from './firebase'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
  useNavigate,
} from 'react-router-dom'
import Login from './Login'
import { onAuthStateChanged, signOut } from 'firebase/auth'

type Props = {}

export type Plos = {
  id: string
  faculty_id?: string
  department_name?: string
  image?: string
  plos?: Plo[]
  quantity?: string
  name?: string
}

export type Plo = {
  PLO: string
}

// ฟังก์ชันสำหรับเพิ่ม Plo ลงใน Firestore
async function addPloToDepartment({
  departmentId,
  newPlo,
}: {
  departmentId: string
  newPlo: Plo
}): Promise<void> {
  // อ้างอิงไปยังเอกสาร department ที่ต้องการอัปเดต
  const departmentDocRef = doc(database, 'department', departmentId)

  // ใช้ updateDoc เพื่อเพิ่มข้อมูลใหม่ลงใน array ของ plos
  await updateDoc(departmentDocRef, {
    plos: arrayUnion(newPlo), // ใช้ arrayUnion เพื่อเพิ่มค่าใหม่ใน array
  })
}

async function editPloInDepartment({
  departmentId,
  oldPlo,
  newPlo,
}: {
  departmentId: string
  oldPlo: Plo
  newPlo: Plo
}) {
  const departmentDocRef = doc(database, 'department', departmentId)

  // ลบ Plo เก่าและเพิ่ม Plo ใหม่ใน array ของ plos
  await updateDoc(departmentDocRef, {
    plos: arrayRemove(oldPlo),
  })
  await updateDoc(departmentDocRef, {
    plos: arrayUnion(newPlo),
  })
}

async function fetchDepartments(): Promise<Plos[]> {
  try {
    // อ้างอิงถึง collection department
    const departmentCollectionRef = collection(database, 'department')

    // ดึงข้อมูลจาก collection department
    const departmentSnapshot = await getDocs(departmentCollectionRef)

    // แปลงข้อมูลเอกสารเป็น array และ return ข้อมูล
    return departmentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    throw new Error('Error fetching departments')
  }
}

// ฟังก์ชันสำหรับลบ Plo จาก Firestore
async function deletePloFromDepartment({
  departmentId,
  ploItem,
}: {
  departmentId: string
  ploItem: Plo
}) {
  const departmentDocRef = doc(database, 'department', departmentId)

  // ใช้ updateDoc และ arrayRemove เพื่อลบ Plo ออกจาก array
  await updateDoc(departmentDocRef, {
    plos: arrayRemove(ploItem), // ลบ ploItem ที่ต้องการ
  })
}

// Component สำหรับ Protected Route
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    })

    return () => unsubscribe()
  }, [])

  if (isAuthenticated === null) {
    return <div>Loading...</div> // คุณสามารถแสดง Loader ขณะตรวจสอบสถานะการล็อกอิน
  }

  // ถ้าไม่ล็อกอินให้ redirect ไปที่หน้า login
  if (!isAuthenticated) {
    return <Navigate to='/login' />
  }

  // ถ้าล็อกอินแล้ว render children
  return children
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Header />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Root />, // ใช้ element ในการ render
      },
    ],
  },
  {
    path: 'login',
    element: <Login />, // หน้า login
  },
])

export default function App({}: Props) {
  return (
    <div>
      <RouterProvider router={router} />
    </div>
  )
}

function Header() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login') // หลังจาก signOut ให้ redirect ไปหน้า login
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div>
      <div className='w-full bg-red-500 h-16 flex justify-between items-center px-4'>
        <div className='flex items-center'>
          <img
            className='object-cover h-20'
            src='https://eng.ksu.ac.th/home/wp-content/uploads/2023/09/EN-KSU-Logo_Eng-color.png'
            alt='logo'
          />
          <span className='text-xl font-bold'>Admin</span>
        </div>
        <button
          className='bg-white text-red-500 px-4 py-2 rounded'
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
      <Outlet />
    </div>
  )
}

function Root() {
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPlo, setSelectedPlo] = useState<Plo | null>(null)

  const { data, isLoading, error } = useQuery<Plos[], any>(
    'departments', // ชื่อของ query key
    fetchDepartments, // ฟังก์ชันที่ใช้ดึงข้อมูล
  )

  const { mutate: deleteMutation } = useMutation(deletePloFromDepartment, {
    onSuccess: () => {
      // อัปเดตแคชหลังจากลบข้อมูลสำเร็จ
      queryClient.invalidateQueries('departments')
    },
    onError: (error) => {
      console.error('Error deleting Plo:', error)
    },
  })
  const { mutate } = useMutation(addPloToDepartment, {
    onSuccess: () => {
      queryClient.invalidateQueries('departments')
      closeModal()
    },
    onError: (error) => {
      console.error('Error adding Plo:', error)
    },
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const departmentIdRef = useRef<string | null>(null)

  // ใช้ mutation สำหรับการแก้ไข Plo
  const editMutation = useMutation(editPloInDepartment, {
    onSuccess: () => {
      // Reload ข้อมูลหลังจากอัปเดตสำเร็จ
      queryClient.invalidateQueries('departments')
      closeEditModal()
    },
    onError: (error) => {
      console.error('Error editing Plo:', error)
    },
  })

  const openEditModal = (departmentId: string, ploItem: Plo) => {
    departmentIdRef.current = departmentId
    setSelectedPlo(ploItem)
    setIsEditModalOpen(true)
    reset({ plo: ploItem.PLO }) // กรอกข้อมูลเดิมลงในฟอร์ม
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedPlo(null)
    departmentIdRef.current = null
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: {},
  } = useForm()

  const toggleModal = (departmentId: string) => {
    departmentIdRef.current = departmentId
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    reset()
    departmentIdRef.current = null
  }

  const handleDeletePlo = (departmentId: string, ploItem: Plo) => {
    // เรียก useMutation เพื่อลบ Plo
    deleteMutation({ departmentId, ploItem })
  }

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>{error.message}</p>

  return (
    <div>
      <div className='container mx-auto'>
        <div className='flex flex-col gap-4 mt-3'>
          {data?.map((item) => (
            <div key={item.id} className='bg-white shadow-lg rounded-lg p-4'>
              <div className='flex items-center gap-x-5 h-auto'>
                <div className='bg-sky-300 drop-shadow-sm min-w-56 h-full p-2 flex items-center rounded-lg text-black font-semibold'>
                  {item.department_name}
                </div>
                <div className='h-full flex-grow flex-nowrap overflow-x-auto max-w-full p-2 rounded-lg'>
                  <div className='flex gap-x-2'>
                    {item.plos?.map((ploItem, index) => (
                      <div
                        key={index}
                        className='relative border border-black rounded-md p-4 w-fit min-w-72 min-h-24 bg-white'
                      >
                        {/* ปุ่ม Delete ที่อยู่ด้านบนขวาของ card */}
                        <button
                          className='absolute top-2 right-2 text-black rounded-full w-6 h-6 flex items-center justify-center'
                          onClick={() => handleDeletePlo(item.id, ploItem)} // เรียก handleDeletePlo
                        >
                          X
                        </button>

                        {/* ข้อมูล PLO */}
                        <span className='block mt-2'>{ploItem.PLO}</span>

                        {/* ปุ่ม Edit ที่อยู่ด้านล่าง */}
                        <button
                          className='absolute bottom-2 left-2 text-white bg-blue-500 rounded-md px-2 py-1 text-sm'
                          onClick={() => openEditModal(item.id, ploItem)} // เรียก handleEditPlo สำหรับแก้ไข PLO
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className='ml-auto bg-blue-500 text-white px-4 py-2 rounded-md shadow'
                  onClick={() => toggleModal(item.id)} // ส่ง departmentId เมื่อกดปุ่ม
                >
                  add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-out'
          onClick={closeModal} // Close when clicking outside
        >
          <div
            className='bg-white rounded-lg p-6 w-96 transition-transform transform scale-95 duration-300 ease-out'
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <h2 className='text-xl font-semibold mb-4'>Add New PLO</h2>
            <form
              onSubmit={handleSubmit((data) =>
                mutate({
                  departmentId: departmentIdRef.current!, // ใช้ departmentId ที่ถูกเลือก
                  newPlo: { PLO: data.plo }, // ข้อมูล PLO ใหม่
                }),
              )}
            >
              <div className='mb-4'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Plo
                </label>
                <textarea
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                  placeholder='Enter Plo description'
                  rows={4} // กำหนดจำนวนแถวที่ต้องการ (ความสูง)
                  {...register('plo', { required: true })} // ยังคงใช้ react-hook-form สำหรับการจัดการฟอร์ม
                />
              </div>
              <div className='flex justify-end'>
                <button
                  className='bg-gray-500 text-white px-4 py-2 rounded mr-2'
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button className='bg-blue-500 text-white px-4 py-2 rounded'>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal สำหรับการแก้ไข PLO */}
      {isEditModalOpen && (
        <div
          className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-out'
          onClick={closeEditModal}
        >
          <div
            className='bg-white rounded-lg p-6 w-96 transition-transform transform scale-95 duration-300 ease-out'
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className='text-xl font-semibold mb-4'>Edit PLO</h2>
            <form
              onSubmit={handleSubmit((data) => {
                if (selectedPlo && departmentIdRef.current) {
                  editMutation.mutate({
                    departmentId: departmentIdRef.current,
                    oldPlo: selectedPlo,
                    newPlo: { PLO: data.plo },
                  })
                }
              })}
            >
              <div className='mb-4'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  PLO Name
                </label>
                <textarea
                  className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                  placeholder='Enter PLO description'
                  {...register('plo', { required: true })}
                />
              </div>
              <div className='flex justify-end'>
                <button
                  className='bg-gray-500 text-white px-4 py-2 rounded mr-2'
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button className='bg-blue-500 text-white px-4 py-2 rounded'>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
