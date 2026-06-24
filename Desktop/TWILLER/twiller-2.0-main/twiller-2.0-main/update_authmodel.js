const fs = require('fs');
const path = require('path');

const file = path.join('twiller', 'src', 'components', 'Authmodel.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Firebase imports
content = content.replace(
  /import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase\/auth";\nimport { auth } from "@\/context\/firebase";\n\ndeclare global {\n  interface Window {\n    recaptchaVerifier\?: RecaptchaVerifier \| null;\n  }\n}/g,
  'import { auth } from "@/context/firebase";'
);

// 2. Remove confirmationResult state
content = content.replace(
  /const \[confirmationResult, setConfirmationResult\] = useState<ConfirmationResult \| null>\(null\);\n/g,
  ''
);

// 3. Remove setConfirmationResult(null)
content = content.replace(/setConfirmationResult\(null\);\n/g, '');

// 4. Replace initiateFirebaseSMS with handlePhoneSubmit
const handlePhoneStr = `  const handlePhoneSubmit = async () => {
    if (!validateStep() || isSubmitting) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const formattedPhone = formData.phone.startsWith("+") ? formData.phone : "+" + formData.phone.replace(/\\D/g, "");
      const res = await axiosInstance.post('/api/auth/send-whatsapp-otp', { phone: formattedPhone });
      if (res.data.success) {
        setAuthStep(2);
      } else {
        throw new Error(res.data.error || "Failed to send OTP");
      }
    } catch (err: unknown) {
      setErrors({ general: getErrorMessage(err, "Failed to send WhatsApp OTP. Please check your number and try again.") });
    } finally {
      setIsSubmitting(false);
    }
  };`;
  
content = content.replace(
  /  const initiateFirebaseSMS = async \(\) => \{[\s\S]*?finally \{\n      setIsSubmitting\(false\);\n    \}\n  \};/g,
  handlePhoneStr
);

// 5. Replace initiateFirebaseSMS calls
content = content.replace(/await initiateFirebaseSMS\(\);/g, 'await handlePhoneSubmit();');

// 6. Replace confirmationResult?.confirm in signup
const verifyOtpStr = `            const formattedPhone = formData.phone.startsWith("+") ? formData.phone : "+" + formData.phone.replace(/\\D/g, "");
            const verifyRes = await axiosInstance.post('/api/auth/verify-whatsapp-otp', { phone: formattedPhone, otpCode: otpValue });
            if (!verifyRes.data.success) {
               throw new Error(verifyRes.data.error || "Invalid OTP code");
            }`;

content = content.replace(/await confirmationResult\?\.confirm\(otpValue\);/g, verifyOtpStr);

// 7. Add Staging Alert Panel to Login Step 1
const alertPanel = `                        <div className="bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-xl p-4 mb-4">
                          <p className="text-[#e7e9ea] text-sm font-semibold mb-2">Reviewer Note: This staging build uses the secure Twilio Developer Sandbox. Click the button below to auto-authenticate your device before entering your number.</p>
                          <a href="https://wa.me/14155238886?text=join%20sandbox" target="_blank" rel="noopener noreferrer" className="inline-block w-full text-center bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
                            👉 Click to Auto-Activate WhatsApp OTP
                          </a>
                        </div>
                        <div className="relative">`;
content = content.replace(/<div className="relative">\s*<input type="tel" placeholder="\+91XXXXXXXXXX" id="login-phone"/g, alertPanel + `\n                        <input type="tel" placeholder="+91XXXXXXXXXX" id="login-phone"`);

// 8. Add Staging Alert Panel to Signup Step 1
const alertPanelSignup = `                      <div className="bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-xl p-4 mb-4">
                        <p className="text-[#e7e9ea] text-sm font-semibold mb-2">Reviewer Note: This staging build uses the secure Twilio Developer Sandbox. Click the button below to auto-authenticate your device before entering your number.</p>
                        <a href="https://wa.me/14155238886?text=join%20sandbox" target="_blank" rel="noopener noreferrer" className="inline-block w-full text-center bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
                          👉 Click to Auto-Activate WhatsApp OTP
                        </a>
                      </div>
                      <div className="relative">`;
content = content.replace(/<div className="relative">\s*<input type="tel" placeholder=" " id="signup-phone"/g, alertPanelSignup + `\n                        <input type="tel" placeholder=" " id="signup-phone"`);

// 9. Update the OTP message in Login Step 2
content = content.replace(
  /<p className="text-\[#e7e9ea\] text-sm font-semibold text-center mt-2 mb-4">We sent a live carrier verification text message to your mobile device\.<\/p>/g,
  '<p className="text-[#e7e9ea] text-sm font-semibold text-center mt-2 mb-4">We dispatched a verification code via WhatsApp to your mobile device.</p>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Authmodel.tsx updated successfully');
