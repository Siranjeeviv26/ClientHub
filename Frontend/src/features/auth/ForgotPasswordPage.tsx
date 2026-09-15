import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      const { authApi } = await import("../../api/auth");
      const response = await authApi.forgotPassword(data.email);
      if (response.success) {
        toast.success("If the email exists, a reset link has been sent.");
      } else {
        toast.error(response.message || "Request failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
        <p className="mt-1.5 text-sm text-gray-500">We will email you a link to reset it</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register("email")}
          autoComplete="email"
          disabled={isLoading}
        />

        <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white" size="lg" loading={isLoading}>
          Send Reset Link
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Remember your password?{" "}
        <Link to="/login" className="text-gray-900 hover:text-gray-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
