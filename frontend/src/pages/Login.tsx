import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguageStore } from "../store/useLanguageStore";
import { useTranslation } from "react-i18next";
import { useActivityLog } from "../utils/activityLogger";
import {
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Globe,
  User,
} from "lucide-react";

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuthStore();
  const { logActivity } = useActivityLog();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"info" | "otp">("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isSignup, setIsSignup] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/news");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        if (step === "info") {
          const res = await register(email, password, name);
          if (res.success && res.data) {
            setQrCodeData(res.data.qrCode);
            setStep("otp");
            logActivity(`Signup Attempt: ${email}`);
          } else {
            setError(res.message || "회원가입 실패");
          }
        } else {
          const res = await login(email, password, otpCode);
          if (res.success) {
            logActivity("User Signup & Login Success");
            navigate("/news");
          } else {
            setError(res.message || "로그인 실패");
          }
        }
      } else {
        const res = await login(email, password, otpCode);
        if (res.requireOtp) {
          setStep("otp");
        } else if (res.success) {
          logActivity("User Login Success");
          navigate("/news");
        } else {
          setError(res.message || "로그인 실패");
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "인증 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-100/80 overflow-hidden p-4">
      {/* Language Toggle */}
      <div className="absolute top-8 right-8 z-50">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50"
        >
          <Globe className="w-4 h-4 text-blue-600" />
          {language === "ko" ? "ENGLISH" : "한국어"}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 p-10 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-50 mb-6 group">
            <ShieldCheck className="w-10 h-10 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {isSignup ? t("register") : t("login_tab")}
          </h2>
          <p className="text-slate-400 mt-2 text-sm font-medium uppercase tracking-widest">
            {isSignup
              ? "Secure Authentication Protocol"
              : "Authorized Personnel Only"}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
          <button
            type="button"
            onClick={() => {
              setIsSignup(false);
              setStep("info");
              setError("");
            }}
            className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${!isSignup ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            {t("login_tab")}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignup(true);
              setStep("info");
              setError("");
            }}
            className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all ${isSignup ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
          >
            {t("signup_tab")}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
            <ShieldCheck size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === "info" ? (
            <>
              {isSignup && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Agent Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                      placeholder="성함을 입력하세요"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Email Identity
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                    placeholder="email@agora.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Access Key
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6">
              {isSignup && qrCodeData && (
                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-inner inline-block animate-in zoom-in-90 duration-700">
                  <p className="text-[10px] text-slate-400 mb-4 font-black uppercase tracking-widest">
                    Google OTP Protocol
                  </p>
                  <img
                    src={qrCodeData}
                    alt="OTP QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                  {" "}
                  Cryptographic Token (6-Digits)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none text-center text-3xl tracking-[0.5em] font-black text-blue-600 shadow-inner"
                  placeholder="000000"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {step === "info"
                  ? isSignup
                    ? "CREATE ACCOUNT"
                    : "NEXT STEP"
                  : "VERIFY & AUTHORIZE"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {step === "otp" && (
            <button
              type="button"
              onClick={() => setStep("info")}
              className="w-full text-[10px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-widest transition-colors"
            >
              Back to Credentials
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
