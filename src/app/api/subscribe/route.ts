import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FROM = "PropFXLab Alerts <alerts@propfxlab.com>";
const REPLY_TO = "qq81174761@gmail.com";
const SUBJECT = "⚡ Welcome to PropFXLab - Your Exclusive Prop Firm Discounts";

function buildWelcomeHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${SUBJECT}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    a { color: #34d399; text-decoration: none; }
    a:hover { text-decoration: underline; }
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
              <h1 style="color:#f1f5f9; font-size:26px; font-weight:800; line-height:1.3; margin-bottom:10px;">
                Your Prop Firm Edge<br/>Starts Here
              </h1>
              <p style="color:#94a3b8; font-size:15px; line-height:1.6;">
                You're now on the list. We'll alert you to the best discount codes,<br/>
                challenge sales, and profit-boost strategies — before anyone else.
              </p>
            </td>
          </tr>

          <!-- Divider bar -->
          <tr>
            <td style="height:3px; background: linear-gradient(90deg, #059669, #34d399, #059669);"></td>
          </tr>

          <!-- Promo codes section -->
          <tr>
            <td style="background:#0f1923; border-left: 1px solid #1e3a2f; border-right: 1px solid #1e3a2f; padding: 32px 40px;">
              <p style="color:#64748b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:20px;">🔥 Current Live Discounts</p>

              <!-- FTMO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1510; border:1px solid #1e3a2f; border-radius:10px; padding:0; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="color:#e2e8f0; font-size:15px; font-weight:700;">FTMO</span>
                          <span style="display:inline-block; background:#052e16; color:#34d399; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; margin-left:8px;">10% OFF</span>
                        </td>
                        <td align="right">
                          <span style="background:#1e3a2f; color:#6ee7b7; font-family:monospace; font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px; letter-spacing:0.08em;">PROPFXLAB10</span>
                        </td>
                      </tr>
                      <tr><td colspan="2" style="padding-top:6px;"><span style="color:#64748b; font-size:12px;">Applies to all challenge sizes · No expiry</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- FundedNext -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1510; border:1px solid #1e3a2f; border-radius:10px; padding:0; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="color:#e2e8f0; font-size:15px; font-weight:700;">FundedNext</span>
                          <span style="display:inline-block; background:#052e16; color:#34d399; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; margin-left:8px;">15% OFF</span>
                        </td>
                        <td align="right">
                          <span style="background:#1e3a2f; color:#6ee7b7; font-family:monospace; font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px; letter-spacing:0.08em;">FXLAB15</span>
                        </td>
                      </tr>
                      <tr><td colspan="2" style="padding-top:6px;"><span style="color:#64748b; font-size:12px;">Stellar &amp; Evaluation accounts · Limited time</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- The Funded Trader -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1510; border:1px solid #1e3a2f; border-radius:10px; padding:0; margin-bottom:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="color:#e2e8f0; font-size:15px; font-weight:700;">The Funded Trader</span>
                          <span style="display:inline-block; background:#052e16; color:#34d399; font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px; margin-left:8px;">20% OFF</span>
                        </td>
                        <td align="right">
                          <span style="background:#1e3a2f; color:#6ee7b7; font-family:monospace; font-size:13px; font-weight:700; padding:4px 12px; border-radius:6px; letter-spacing:0.08em;">TFT20PROP</span>
                        </td>
                      </tr>
                      <tr><td colspan="2" style="padding-top:6px;"><span style="color:#64748b; font-size:12px;">Royal &amp; Standard challenges · Ends soon</span></td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#0f1923; border-left:1px solid #1e3a2f; border-right:1px solid #1e3a2f; padding: 0 40px 32px 40px; text-align:center;">
              <p style="color:#64748b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:16px;">🧮 Profit Calculator</p>
              <p style="color:#94a3b8; font-size:14px; line-height:1.6; margin-bottom:20px;">
                See exactly how much you'll take home after splits, resets,<br/>and withdrawal fees — before you buy a challenge.
              </p>
              <a href="https://propfxlab.com/calculator"
                 style="display:inline-block; background: linear-gradient(135deg, #059669, #34d399); color:#fff; font-size:14px; font-weight:700; padding:12px 32px; border-radius:8px; text-decoration:none;">
                Open Profit Calculator →
              </a>
            </td>
          </tr>

          <!-- What to expect -->
          <tr>
            <td style="background:#080d12; border-left:1px solid #1e3a2f; border-right:1px solid #1e3a2f; border-top:1px solid #1e3a2f; padding:28px 40px;">
              <p style="color:#64748b; font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:16px;">📬 What You'll Receive</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:12px; padding-bottom:12px; vertical-align:top;">
                    <div style="background:#0a1510; border:1px solid #1e3a2f; border-radius:8px; padding:14px;">
                      <div style="font-size:18px; margin-bottom:6px;">🚨</div>
                      <div style="color:#e2e8f0; font-size:13px; font-weight:600; margin-bottom:4px;">Flash Sales</div>
                      <div style="color:#64748b; font-size:12px;">Time-limited 50–80% off events, straight to your inbox</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:12px; padding-bottom:12px; vertical-align:top;">
                    <div style="background:#0a1510; border:1px solid #1e3a2f; border-radius:8px; padding:14px;">
                      <div style="font-size:18px; margin-bottom:6px;">📊</div>
                      <div style="color:#e2e8f0; font-size:13px; font-weight:600; margin-bottom:4px;">Firm Comparisons</div>
                      <div style="color:#64748b; font-size:12px;">Side-by-side breakdowns of payout rules &amp; fees</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding-right:12px; vertical-align:top;">
                    <div style="background:#0a1510; border:1px solid #1e3a2f; border-radius:8px; padding:14px;">
                      <div style="font-size:18px; margin-bottom:6px;">🎯</div>
                      <div style="color:#e2e8f0; font-size:13px; font-weight:600; margin-bottom:4px;">Strategy Alerts</div>
                      <div style="color:#64748b; font-size:12px;">Rule changes &amp; risk tips that protect your funded account</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:12px; vertical-align:top;">
                    <div style="background:#0a1510; border:1px solid #1e3a2f; border-radius:8px; padding:14px;">
                      <div style="font-size:18px; margin-bottom:6px;">💸</div>
                      <div style="color:#e2e8f0; font-size:13px; font-weight:600; margin-bottom:4px;">Payout Insights</div>
                      <div style="color:#64748b; font-size:12px;">Real withdrawal timelines &amp; community payout reports</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#060a0e; border:1px solid #1e3a2f; border-top:none; border-radius:0 0 16px 16px; padding:24px 40px; text-align:center;">
              <p style="color:#334155; font-size:11px; line-height:1.7;">
                You're receiving this because <strong style="color:#475569;">${email}</strong> subscribed at <a href="https://propfxlab.com" style="color:#475569;">propfxlab.com</a>.<br/>
                <a href="https://propfxlab.com" style="color:#64748b;">Visit site</a>
                &nbsp;·&nbsp;
                <a href="mailto:${REPLY_TO}" style="color:#64748b;">Contact us</a>
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
    // Log but continue; the welcome email should still go out
    console.error("[subscribe] contacts.create failed:", err);
  }

  // Step B — send welcome email
  const { error } = await resend.emails.send({
    from: FROM,
    to: [email],
    replyTo: REPLY_TO,
    subject: SUBJECT,
    html: buildWelcomeHtml(email),
  });

  if (error) {
    console.error("[subscribe] emails.send failed:", error);
    return NextResponse.json({ error: "Failed to send welcome email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
