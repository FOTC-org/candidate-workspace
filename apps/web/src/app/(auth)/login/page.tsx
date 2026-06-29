import type { Metadata } from "next";
import { LoginForm } from "@/components/core/login-form";

export const metadata: Metadata = { title: "Login — UserHub" };

export default function LoginPage(): React.JSX.Element {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Sign in</h1>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-gray-600">
        No account?{" "}
        <a
          href="/register"
          className="font-medium text-blue-600 hover:underline"
        >
          Register
        </a>
      </p>
    </>
  );
}
