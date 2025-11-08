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

const allowedOrigin = "https://www.shoper.id";

const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// --- OPTIONS preflight ---
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// --- POST handler ---
export async function POST(req: Request) {
  try {
    const body: LeadPayload = await req.json();
    
    // --- CONSOLE.LOG 1: Data mentah yang diterima ---
    console.log("📥 Menerima body payload:", body);

    if (!body.nama || !body.email || !body.phone) {
      return NextResponse.json(
        { error: "Nama, email, dan phone wajib diisi." },
        { status: 400, headers: corsHeaders }
      );
    }

// ======================================================
    // 💡 Langkah Baru: Cek Duplikasi Email
    // ======================================================

    const { count: existingCount, error: checkError } = await supabase
      .from("leads")
      .select("email", { count: "exact", head: true })
      .eq("email", body.email);
    
    // Tangani error saat pengecekan
    if (checkError) {
      console.error("❌ Error saat memeriksa duplikasi:", checkError);
      throw checkError;
    }

    // Jika email sudah terdaftar, kirim respons 409 Conflict
    if (existingCount && existingCount > 0) {
      console.log(`⚠️ Email ${body.email} sudah ada (${existingCount} record). INSERT dibatalkan.`);
      return NextResponse.json(
        { success: false, error: "Email sudah terdaftar" },
        // Menggunakan status 409 Conflict
        { status: 409, headers: corsHeaders } 
      );
    }
    // ======================================================

    const leadData = {
      nama: body.nama,
      email: body.email,
      phone: body.phone,
      source_page: body.source_page || req.headers.get("referer") || null,
      user_agent: body.user_agent || req.headers.get("user-agent") || null,
      ip: body.ip || req.headers.get("x-forwarded-for") || null,
      idempotency_key: body.idempotency_key || `${body.email}-${Date.now()}`,
    };
    
    // --- CONSOLE.LOG 2: Data lengkap sebelum dikirim ke Supabase ---
    console.log("💾 Data siap di-insert ke Supabase:", leadData);

    const { data, error } = await supabase
      .from("leads")
      .insert([leadData])
      .select();

    if (error) throw error;
    
    // --- CONSOLE.LOG 3: Konfirmasi Insert Berhasil ---
    console.log("✅ Data berhasil di-insert ke tabel 'leads':", data);

    try {
	  await supabase.functions.invoke("events-log", {
	    body: {
	      eventName: "Lead",
	      eventData: {
	        nama: leadData.nama,
	        email: leadData.email,
	        phone: leadData.phone,
	        source_page: leadData.source_page,
	      },
	      clientInfo: {
	        sessionId: `${leadData.email}-${Date.now()}`,
	        ip: leadData.ip,
	        userAgent: leadData.user_agent,
	        url: leadData.source_page,
	      },
	    },
	  });
	  console.log("✅ Event Lead berhasil dikirim ke events-log");
	} catch (logError) {
	  console.error("❌ Gagal mengirim event Lead ke events-log:", logError);
	}
		
    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (err) {
    // --- CONSOLE.LOG 4: Menampilkan error Supabase/Server yang rinci ---
    console.error("❌ API Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500, headers: corsHeaders }
    );
  }
}
