import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FROM = "PropFXLab Alerts <alerts@propfxlab.com>";
const REPLY_TO = "qq81174761@gmail.com";

type LocaleKey = "en" | "es" | "cn" | "tw" | "th" | "vi" | "pt";

const copy: Record<LocaleKey, { subject: string; hero: string; subhero: string; ctaLabel: string; footerUnsub: string }> = {
  en: {
    subject: "⚡ Welcome to PropFXLab - Your Exclusive Prop Firm Discounts",
    hero: "Your Prop Firm Edge Starts Here",
    subhero: "You're now on the list. We'll alert you to the best discount codes, challenge sales, and profit-boost strategies — before anyone else.",
    ctaLabel: "Open Profit Calculator →",
    footerUnsub: "You're receiving this because you subscribed at",
  },
  es: {
    subject: "⚡ Bienvenido a PropFXLab - Tus Descuentos Exclusivos de Prop Firms",
    hero: "Tu Ventaja en Prop Firms Empieza Aquí",
    subhero: "Ya estás en la lista. Te avisaremos sobre los mejores códigos de descuento, ventas de desafíos y estrategias de maximización de ganancias — antes que nadie.",
    ctaLabel: "Abrir Calculadora de Ganancias →",
    footerUnsub: "Recibes esto porque te suscribiste en",
  },
  cn: {
    subject: "⚡ 欢迎加入 PropFXLab - 你的专属道具公司折扣",
    hero: "你的道具公司优势从这里开始",
    subhero: "你已成功加入订阅列表。我们将第一时间向你推送最佳折扣码、挑战特卖与利润提升策略。",
    ctaLabel: "打开利润计算器 →",
    footerUnsub: "你收到此邮件是因为你在以下网站订阅：",
  },
  tw: {
    subject: "⚡ 歡迎加入 PropFXLab - 你的專屬道具公司折扣",
    hero: "你的道具公司優勢從這裡開始",
    subhero: "你已成功加入訂閱清單。我們將第一時間向你推送最佳折扣碼、挑戰特賣與利潤提升策略。",
    ctaLabel: "開啟利潤計算機 →",
    footerUnsub: "你收到此郵件是因為你在以下網站訂閱：",
  },
  th: {
    subject: "⚡ ยินดีต้อนรับสู่ PropFXLab - ส่วนลดพิเศษ Prop Firm ของคุณ",
    hero: "ความได้เปรียบ Prop Firm ของคุณเริ่มต้นที่นี่",
    subhero: "คุณอยู่ในรายชื่อแล้ว เราจะแจ้งเตือนคุณเกี่ยวกับโค้ดส่วนลด การขาย Challenge และกลยุทธ์เพิ่มกำไรที่ดีที่สุด — ก่อนใคร",
    ctaLabel: "เปิดเครื่องคำนวณกำไร →",
    footerUnsub: "คุณได้รับอีเมลนี้เพราะสมัครสมาชิกที่",
  },
  vi: {
    subject: "⚡ Chào mừng đến PropFXLab - Ưu đãi Prop Firm độc quyền của bạn",
    hero: "Lợi thế Prop Firm của bạn bắt đầu từ đây",
    subhero: "Bạn đã có mặt trong danh sách. Chúng tôi sẽ thông báo cho bạn về các mã giảm giá tốt nhất, đợt sale challenge và chiến lược tăng lợi nhuận — trước bất kỳ ai khác.",
    ctaLabel: "Mở Máy Tính Lợi Nhuận →",
    footerUnsub: "Bạn nhận được email này vì đã đăng ký tại",
  },
  pt: {
    subject: "⚡ Bem-vindo ao PropFXLab - Seus Descontos Exclusivos de Prop Firms",
    hero: "Sua Vantagem em Prop Firms Começa Aqui",
    subhero: "Você já está na lista. Vamos te avisar sobre os melhores códigos de desconto, vendas de desafios e estratégias para maximizar ganhos — antes de qualquer um.",
    ctaLabel: "Abrir Calculadora de Lucros →",
    footerUnsub: "Você está recebendo isto porque se inscreveu em",
  },
};

function getLocaleKey(locale: string): LocaleKey {
  return (locale in copy ? locale : "en") as LocaleKey;
}

function buildWelcomeHtml(email: string, locale: string): string {
  const l = getLocaleKey(locale);
  const c = copy[l];

  return `<!DOCTYPE html>
<html lang="${l === "cn" || l === "tw" ? "zh" : l}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${c.subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    a { color: #34d399; text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f1923 0%, #111827 100%); border: 1px solid #1e3a2f; border-radius: 16px 16px 0 0; padding: 36px 40px; text-align: center;">
              <div style="display:inline-block; background: #052e16; border: 1px solid #34d399; border-radius: 8px; padding: 6px 14px; margin-bottom: 20px;">
                <span style="color:#34d399; font-size:12px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;">⚡ PropFXLab Alerts</span>
              </div>
              <h1 style="color:#f1f5f9; font-size:26px; font-weight:800; line-height:1.3; margin-bottom:10px;">${c.hero}</h1>
              <p style="color:#94a3b8; font-size:15px; line-height:1.6;">${c.subhero}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="height:3px; background: linear-gradient(90deg, #059669, #34d399, #059669);"></td>
          </tr>

          <!-- Promo codes -->
          <tr>
            <td style="background:#0f1923; border-left:1px solid #1e3a2f; border-right:1px solid #1e3a2f; padding:32px 40px;">
              <p style="color:#64748b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:20px;">🔥 Current Live Discounts</p>

              <!-- FTMO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1510; border:1px solid #1e3a2f; border-radius:10px; margin-bottom:12px;">
                <tr><td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><span style="color:#e2e8f0; font-size:15px; font-weight:700;">FTMO</span> <span style="background:#052e16; color:#34d399; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px;">10% OFF</span></td>
                      <td align="right"><span style="background:#1e3a2f; color:#6ee7b7; font-family:monospace; font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px;">PROPFXLAB10</span></td>
                    </tr>
                    <tr><td colspan="2" style="padding-top:6px;"><span style="color:#64748b; font-size:12px;">All challenge sizes · No expiry</span></td></tr>
                  </table>
                </td></tr>
              </table>

              <!-- FundedNext -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1510; border:1px solid #1e3a2f; border-radius:10px; margin-bottom:12px;">
                <tr><td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><span style="color:#e2e8f0; font-size:15px; font-weight:700;">FundedNext</span> <span style="background:#052e16; color:#34d399; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px;">15% OFF</span></td>
                      <td align="right"><span style="background:#1e3a2f; color:#6ee7b7; font-family:monospace; font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px;">FXLAB15</span></td>
                    </tr>
                    <tr><td colspan="2" style="padding-top:6px;"><span style="color:#64748b; font-size:12px;">Stellar &amp; Evaluation · Limited time</span></td></tr>
                  </table>
                </td></tr>
              </table>

              <!-- The Funded Trader -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1510; border:1px solid #1e3a2f; border-radius:10px;">
                <tr><td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td><span style="color:#e2e8f0; font-size:15px; font-weight:700;">The Funded Trader</span> <span style="background:#052e16; color:#34d399; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px;">20% OFF</span></td>
                      <td align="right"><span style="background:#1e3a2f; color:#6ee7b7; font-family:monospace; font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px;">TFT20PROP</span></td>
                    </tr>
                    <tr><td colspan="2" style="padding-top:6px;"><span style="color:#64748b; font-size:12px;">Royal &amp; Standard · Ends soon</span></td></tr>
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#0f1923; border-left:1px solid #1e3a2f; border-right:1px solid #1e3a2f; padding:0 40px 32px; text-align:center;">
              <p style="color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:20px; margin-top:8px;">🧮 ${c.ctaLabel.replace(" →", "")}</p>
              <a href="https://propfxlab.com/calculator"
                 style="display:inline-block; background:linear-gradient(135deg,#059669,#34d399); color:#fff; font-size:14px; font-weight:700; padding:12px 32px; border-radius:8px;">
                ${c.ctaLabel}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#060a0e; border:1px solid #1e3a2f; border-top:none; border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <p style="color:#334155; font-size:11px; line-height:1.7;">
                ${c.footerUnsub} <strong style="color:#475569;">${email}</strong> ·
                <a href="https://propfxlab.com" style="color:#475569;">propfxlab.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:${REPLY_TO}" style="color:#64748b;">Contact</a>
                &nbsp;·&nbsp;
                <span style="color:#334155;">© 2026 PropFXLab</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  let email: string;
  let locale: string;

  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
    locale = (body.locale ?? "en").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 422 });
  }

  // Step A — add to Resend Contacts (v6: no audienceId needed)
  try {
    await resend.contacts.create({ email, unsubscribed: false });
  } catch (err) {
    console.error("[subscribe] contacts.create failed:", err);
  }

  // Step B — send localized welcome email
  const l = getLocaleKey(locale);
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    replyTo: REPLY_TO,
    subject: copy[l].subject,
    html: buildWelcomeHtml(email, locale),
  });

  if (error) {
    console.error("[subscribe] emails.send failed:", error);
    return NextResponse.json({ error: "Failed to send welcome email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
