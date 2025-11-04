import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerId, analysis, template } = await req.json();

    if (!playerId || !analysis || !template) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generating PDF for player:", playerId);

    // Generate HTML content that can be printed to PDF from browser
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analýza - ${analysis.code || playerId}</title>
  <style>
    @page {
      size: A4;
      margin: 40px;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      padding: 40px;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #3b82f6;
    }
    .color-badge {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 10px 24px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 14px;
    }
    .template-name {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .section-content {
      font-size: 14px;
      line-height: 1.8;
      color: #374151;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .page-break {
      page-break-after: always;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
      }
      .page-break {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="template-name">${template.name}</div>
      <div class="code">${analysis.code || ""}</div>
    </div>
    ${analysis.color ? `<div class="color-badge">${analysis.color}</div>` : ""}
  </div>

  ${
      analysis.role
        ? `
  <div class="section">
    <div class="section-title">Role</div>
    <div class="section-content">${analysis.role}</div>
  </div>
  `
        : ""
    }

  ${
      analysis.faithText
        ? `
  <div class="section">
    <div class="section-title">Průběh hry</div>
    <div class="section-content">${analysis.faithText}</div>
  </div>
  `
        : ""
    }

  ${
      analysis.strength1_name || analysis.strength1_text
        ? `
  <div class="section">
    <div class="section-title">Silná stránka 1${analysis.strength1_name ? ": " + analysis.strength1_name : ""}</div>
    <div class="section-content">${analysis.strength1_text || ""}</div>
  </div>
  `
        : ""
    }

  ${
      analysis.strength2_name || analysis.strength2_text
        ? `
  <div class="section">
    <div class="section-title">Silná stránka 2${analysis.strength2_name ? ": " + analysis.strength2_name : ""}</div>
    <div class="section-content">${analysis.strength2_text || ""}</div>
  </div>
  `
        : ""
    }

  <div class="page-break"></div>

  ${
      analysis.flaw1_name || analysis.flaw1_text
        ? `
  <div class="section">
    <div class="section-title">Oblast ke zlepšení${analysis.flaw1_name ? ": " + analysis.flaw1_name : ""}</div>
    <div class="section-content">${analysis.flaw1_text || ""}</div>
  </div>
  `
        : ""
    }

  ${
      analysis.teamTips
        ? `
  <div class="section">
    <div class="section-title">Doporučení pro tým</div>
    <div class="section-content">${analysis.teamTips}</div>
  </div>
  `
        : ""
    }

  <div class="footer">
    <p>Šablona: ${template.name} (verze ${template.version})</p>
    <p style="margin-top: 8px;">Vygenerováno: ${
      new Date().toLocaleDateString("cs-CZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }</p>
  </div>

  <script>
    // Auto-print when opened
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
