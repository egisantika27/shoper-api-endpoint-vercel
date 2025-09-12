import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Definisi tipe data yang masuk dari form
type LeadPayload = {
  nama: string;
  email: string;
  phone: string; // [DIUBAH] Kembali menggunakan 'phone'
  source_page?: string;
  user_agent?: string;
  ip?: string;
  idempotency_key?: string;
};

// ✅ Inisialisasi Supabase pakai ENV
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Definisikan header CORS di satu tempat agar mudah dikelola
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Ganti dengan domain spesifik Anda di produksi
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handler untuk preflight request (OPTIONS) dari browser
export async function OPTIONS(req: Request) {
    return NextResponse.json({}, { headers: corsHeaders });
}


// Handler untuk POST request
export async function POST(req: Request) {
  try {
    const body: LeadPayload = await req.json();

    // Validasi sederhana
    if (!body.nama || !body.email || !body.phone) { // [DIUBAH] Gunakan 'phone'
      return NextResponse.json(
        { error: "Nama, email, dan phone wajib diisi." }, // [DIUBAH] Pesan error disesuaikan
        { status: 400, headers: corsHeaders }
      );
    }

    // Tambahkan metadata otomatis
    const leadData = {
      nama: body.nama,
      email: body.email,
      phone: body.phone, // [DIUBAH] Gunakan 'phone' langsung
      source_page: body.source_page || req.headers.get("referer") || null,
      user_agent: body.user_agent || req.headers.get("user-agent") || null,
      ip: body.ip || req.headers.get("x-forwarded-for") || null,
      idempotency_key:
        body.idempotency_key || `${body.email}-${Date.now()}`
    };

    // Simpan ke Supabase
    const { data, error } = await supabase
      .from("leads")
      .insert([leadData])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Gagal menyimpan ke database" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500, headers: corsHeaders }
    );
  }
}

