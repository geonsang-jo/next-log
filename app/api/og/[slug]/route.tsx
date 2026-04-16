import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";

async function loadFonts() {
  const [bold, regular] = await Promise.all([
    fetch(
      "https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/static/Pretendard-Bold.otf"
    ).then((res) => res.arrayBuffer()),
    fetch(
      "https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/static/Pretendard-Regular.otf"
    ).then((res) => res.arrayBuffer()),
  ]);
  return { bold, regular };
}

function renderTitle(title: string, highlightWord?: string) {
  if (!highlightWord || !title.includes(highlightWord)) {
    return (
      <span style={{ color: "#1a1a1a" }}>{title}</span>
    );
  }

  const idx = title.indexOf(highlightWord);
  const before = title.slice(0, idx);
  const after = title.slice(idx + highlightWord.length);

  return (
    <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", whiteSpace: "pre" }}>
      {before && <span style={{ color: "#1a1a1a" }}>{before}</span>}
      <span
        style={{
          background: "linear-gradient(90deg, #7b5ea7, #9f6ba0, #d47a8c)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {highlightWord}
      </span>
      {after && <span style={{ color: "#1a1a1a" }}>{after}</span>}
    </span>
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title") || "Title";
    const highlightWord = searchParams.get("highlightWord") || undefined;

    const fonts = await loadFonts();

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage:
              "linear-gradient(135deg, #f0f0f5, #e8e6f0, #f5f3fa)",
            position: "relative",
            fontFamily: "Pretendard",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.3,
              maxWidth: "1000px",
              padding: "0 60px",
              letterSpacing: "-1px",
            }}
          >
            {renderTitle(title, highlightWord)}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 40,
              right: 50,
              display: "flex",
              alignItems: "center",
              fontSize: 24,
              color: "#888888",
              fontWeight: 400,
            }}
          >
            Geon
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Pretendard",
            data: fonts.bold,
            weight: 700 as const,
            style: "normal" as const,
          },
          {
            name: "Pretendard",
            data: fonts.regular,
            weight: 400 as const,
            style: "normal" as const,
          },
        ],
      }
    );
  } catch (e) {
    console.error("OG image generation failed:", e);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
