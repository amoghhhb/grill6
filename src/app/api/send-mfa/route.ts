import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: Request) {
  try {
    const { email, userId, name } = await req.json();
    console.log("🛠️ [MFA] Starting MFA flow for:", email);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("❌ [MFA] Missing SMTP Credentials in .env");
      throw new Error("SMTP credentials not configured");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 1. Store code in DB
    console.log("💾 [MFA] Storing code in database...");
    const { error: dbError } = await supabase
      .from("mfa_codes")
      .upsert({ 
        user_id: userId, 
        code,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60000).toISOString()
      }, { onConflict: "user_id" });

    if (dbError) {
      console.error("❌ [MFA] Database Error:", dbError.message);
      throw dbError;
    }

    // 2. Send Email via SMTP
    console.log("📧 [MFA] Attempting to send email via:", process.env.SMTP_HOST);
    await transporter.sendMail({
      from: `"Grill 6 Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔐 Your Grill 6 Security Code",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 20px; color: #0f172a; text-align: center;">Security Verification</h2>
            <p>Hello ${name},</p>
            <p>Your Grill 6 account requires secondary verification. Please enter the code below to access your dashboard:</p>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #3c8dbc; padding: 30px; background: #f1f5f9; border-radius: 16px; text-align: center; margin: 30px 0; border: 2px dashed #cbd5e1;">
              ${code}
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
              <strong>Security Tip:</strong> This code is only valid for 10 minutes. 
              If you did not attempt to log in, please ignore this email or contact support.
            </p>
          </div>
        </div>
      `,
    });

    console.log("✅ [MFA] Success: Code sent to", email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ [MFA] Critical Failure:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
