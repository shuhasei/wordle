export async function onRequestGet(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "public, max-age=3600"
  };

  try {
    const requestUrl = new URL(context.request.url);
    const letter = (
      requestUrl.searchParams.get("letter") || ""
    ).trim().toLowerCase();

    if (!/^[a-z]$/.test(letter)) {
      return new Response(
        JSON.stringify({
          error: "頭文字を半角英字1文字で指定してください。"
        }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    const pattern = `${letter}????`;

    const datamuseUrl =
      "https://api.datamuse.com/words" +
      `?sp=${encodeURIComponent(pattern)}` +
      "&max=500";

    const apiResponse = await fetch(datamuseUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "word-chain-cloudflare-pages"
      }
    });

    if (!apiResponse.ok) {
      throw new Error(
        `Datamuse API returned ${apiResponse.status}`
      );
    }

    const data = await apiResponse.json();

    const words = [
      ...new Set(
        data
          .map(item => String(item.word || "").toUpperCase())
          .filter(word =>
            /^[A-Z]{5}$/.test(word) &&
            word.startsWith(letter.toUpperCase())
          )
      )
    ];

    return new Response(
      JSON.stringify({
        letter: letter.toUpperCase(),
        count: words.length,
        words
      }),
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "英単語を取得できませんでした。",
        detail: error instanceof Error
          ? error.message
          : "Unknown error"
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
