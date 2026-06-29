import type { Metadata } from "next";
import { RegisterForm } from "@/components/core/register-form";

export const metadata: Metadata = { title: "Register — UserHub" };

export default function RegisterPage(): React.JSX.Element {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Create account</h1>
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </a>
      </p>
    </>
  );
}
