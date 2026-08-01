import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function AuthPage() {
  return (
    <div className="shell auth-layout">
      <div className="auth-aside">
        <p className="eyebrow">Built for the next owner</p>
        <h2>List once. Reach every visitor.</h2>
        <p>Your account works for both browsing and selling—no roles, no separate dashboard setup.</p>
        <Link href="/" className="inline-link">← Continue browsing</Link>
      </div>
      <AuthForm />
    </div>
  );
}
