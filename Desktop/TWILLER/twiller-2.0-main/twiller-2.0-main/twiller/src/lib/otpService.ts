/**
 * Underlying OTP Dispatch Service
 * Implements pre-validation checks before making any API calls
 */
export async function dispatchOtp(
  channel: "email" | "mobile" | "both",
  email: string | null | undefined,
  phone: string | null | undefined,
  sendRequest: () => Promise<any>
): Promise<any> {
  // 1. WhatsApp OTP Validation (Global)
  if (channel === "mobile" || channel === "both") {
    if (!phone || !phone.trim()) {
      throw new Error(
        "Mobile number is missing. Please add a mobile number to your account profile to receive the WhatsApp OTP. Note: You must also join the WhatsApp Sandbox to receive the code."
      );
    }
  }

  // 2. Email OTP Validation (Global)
  if (channel === "email" || channel === "both") {
    if (!email || !email.trim() || email.includes("@phone.twiller.local")) {
      throw new Error(
        "Email address is missing. Please add an email to your account profile to receive the OTP."
      );
    }
  }

  try {
    return await sendRequest();
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Failed to dispatch OTP";
    throw new Error(errorMsg);
  }
}
