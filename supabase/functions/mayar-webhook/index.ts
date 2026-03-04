import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const body = await req.json();
    
    // 1. CUMA PROSES KALAU EVENT-NYA "PEMBAYARAN MASUK" DAN "SUKSES"
    if (body.event === "payment.received" && body.data?.status === "SUCCESS") {
      const payload = body.data;
      const customerEmail = payload.customerEmail;
      
      // Mayar kadang ngirim nama produk di 'productName' atau 'membershipTierName'
      const productName = payload.productName || payload.membershipTierName || "";
      const amount = payload.amount;
      const orderId = payload.id;

      console.log(`Memproses pembayaran untuk: ${customerEmail} | Produk: ${productName}`);

      // 2. LOGIKA PEMBAGIAN TIER (PENTING!)
      // Defaultnya kita anggap "pro" (Insider)
      let assignedTier = "pro"; 
      
      // Kalau di nama produk Mayar lu ada kata "visionary", "lifetime", atau "exclusive", 
      // sistem bakal otomatis ngasih tier "visionary".
      const pNameLower = productName.toLowerCase();
      if (pNameLower.includes("visionary") || pNameLower.includes("lifetime") || pNameLower.includes("exclusive")) {
        assignedTier = "visionary";
      }

      // 3. KONEKSI KE SUPABASE
      // Pastikan MY_SUPABASE_URL dan MY_SERVICE_ROLE_KEY sudah lu set di secrets kemaren
      const supabaseUrl = Deno.env.get('MY_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('MY_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 4. CARI USER BERDASARKAN EMAIL
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;

      const targetUser = usersData.users.find(u => u.email === customerEmail);

      if (!targetUser) {
        console.error(`❌ Gagal: User dengan email ${customerEmail} tidak ditemukan di database IELS.`);
        // Tetap return 200 supaya Mayar gak ngulang-ngulang ngirim webhook
        return new Response(JSON.stringify({ error: "User not found, but webhook received." }), { status: 200 });
      }

      const userId = targetUser.id;

      // 5. UPDATE ATAU INSERT MEMBERSHIP
      const { data: existing } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing) {
        await supabase
          .from('memberships')
          .update({ tier: assignedTier, status: 'active', updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('memberships')
          .insert({ user_id: userId, tier: assignedTier, status: 'active' });
      }

      // 6. CATAT KE TABEL TRANSACTIONS (Sebagai History)
      await supabase.from('transactions').insert({
        user_id: userId,
        tier: assignedTier,
        amount: amount,
        currency: 'IDR',
        status: 'success',
        mayar_order_id: orderId,
        paid_at: new Date().toISOString(),
        metadata: { 
          product_name: productName,
          mayar_customer_email: customerEmail 
        }
      });

      console.log(`✅ SUKSES! Tier [${assignedTier}] diaktifkan untuk: ${customerEmail}`);
    }

    // Beri jempol (200 OK) ke Mayar
    return new Response(JSON.stringify({ success: true, message: "Webhook processed" }), { 
      headers: { "Content-Type": "application/json" }, 
      status: 200 
    });

  } catch (error: any) {
    console.error("🔥 Webhook Fatal Error:", error.message);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
});