import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

// Create SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return NextResponse.json({ error: "SMTP credentials not configured" }, { status: 500 });
    }

    const info = await transporter.sendMail({
      from: `"Grill 6" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Email API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
