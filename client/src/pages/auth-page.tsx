import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  token: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [showMfa, setShowMfa] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<LoginForm | null>(null);

  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Panel - Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-bold font-display">Antigravity</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm 
                onMfaRequired={(creds) => {
                  setTempCredentials(creds);
                  setShowMfa(true);
                }} 
              />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent" />
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold font-display mb-6">Secure News & Discussion Platform</h2>
          <p className="text-lg text-slate-300 leading-relaxed">
            Join the conversation with generational insights, AI-powered analysis, and a secure community environment.
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="text-primary mb-3" size={32} />
              <h3 className="font-bold mb-1">MFA Secured</h3>
              <p className="text-sm text-slate-400">Enterprise-grade security for your account.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="text-primary mb-3" size={32} />
              <h3 className="font-bold mb-1">AI Analysis</h3>
              <p className="text-sm text-slate-400">Deep insights into every news story.</p>
            </div>
          </div>
        </div>
      </div>

      {/* MFA Modal */}
      <Dialog open={showMfa} onOpenChange={setShowMfa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Please enter the code from your authenticator app.
            </DialogDescription>
          </DialogHeader>
          <MfaForm 
            credentials={tempCredentials} 
            onSubmit={(token) => {
              if (tempCredentials) {
                loginMutation.mutate({ ...tempCredentials, token });
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoginForm({ onMfaRequired }: { onMfaRequired: (data: LoginForm) => void }) {
  const { loginMutation } = useAuth();
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data, {
      onSuccess: (response: any) => {
        if (response.mfaRequired) {
          onMfaRequired(data);
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full btn-primary" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
            Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const form = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
  });

  const onSubmit = (data: z.infer<typeof insertUserSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Get started with Antigravity today</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full btn-primary" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MfaForm({ credentials, onSubmit }: { credentials: LoginForm | null, onSubmit: (token: string) => void }) {
  const [token, setToken] = useState("");
  
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="mfa-token">Authenticator Code</Label>
        <Input 
          id="mfa-token" 
          placeholder="000000" 
          value={token}
          onChange={(e) => setToken(e.target.value)}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
      </div>
      <Button 
        onClick={() => onSubmit(token)} 
        className="w-full btn-primary"
        disabled={token.length !== 6}
      >
        Verify
      </Button>
    </div>
  );
}
