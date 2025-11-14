import { twMerge } from 'tailwind-merge';

export function Input({ className, ...props }) {
  const defaultStyles = `w-full h-10 text-sm rounded-md border border-[#8F5400] bg-white
                          text-gray-900 placeholder-gray-400 px-4 outline-none focus:border-gray-300
                          focus:ring-2 focus:ring-gray-100 transition`;

  return <input {...props} className={twMerge(defaultStyles, className)} />;
}

export default Input;