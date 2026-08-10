"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import toast from "react-hot-toast";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokens, loadCurrentUser } = useAuthStore();

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (accessToken && refreshToken) {
      setTokens({ accessToken, refreshToken, expiresIn: 900 });
      loadCurrentUser()
        .then(() => {
          toast.success("Giriş başarılı! 🎮");
          router.replace("/dashboard");
        })
        .catch(() => {
          toast.error("Kullanıcı bilgileri alınamadı");
          router.replace("/login");
        });
    } else {
      toast.error("OAuth hatası");
      router.replace("/login");
    }
  }, [params, router, setTokens, loadCurrentUser]);

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">🔐</div>
      <p className="text-gray-400">Giriş tamamlanıyor...</p>
      <div className="mt-4 flex justify-center">
        <svg
          className="w-6 h-6 animate-spin text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
