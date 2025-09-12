import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LeadPayload = {
  nama: string;
  email: string;
  phone: string;
  source_page?: string;
  user_agent?: string;
  ip?: string;
  idempotency_key?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const allowedOrigin = "https://shoper-page-landing-d5hicj9e8-egisantika27s-projects.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// --- OPTIONS preflight ---
export async function OPTIONS(req: Request) {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// --- POST handler ---
export async function POST(req: Request) {
  try {
    const body: LeadPayload = await req.json();

    if (!body.nama || !body.email || !body.phone) {
      return NextResponse.json(
        { error: "Nama, email, dan phone wajib diisi." },
        { status: 400, headers: corsHeaders }
      );
    }

    const leadData = {
      nama: body.nama,
      email: body.email,
      phone: body.phone,
      source_page: body.source_page || req.headers.get("referer") || null,
      user_agent: body.user_agent || req.headers.get("user-agent") || null,
      ip: body.ip || req.headers.get("x-forwarded-for") || null,
      idempotency_key: body.idempotency_key || `${body.email}-${Date.now()}`,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert([leadData])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
