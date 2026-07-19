const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "public, max-age=3600"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

async function getWords(request) {
  const requestUrl = new URL(request.url);

  const letter = (
    requestUrl.searchParams.get("letter") || ""
  )
    .trim()
    .toLowerCase();

  if (!/^[a-z]$/.test(letter)) {
    return jsonResponse(
      {
        error:
          "頭文字を半角英字1文字で指定してください。"
      },
      400
    );
  }

  const datamuseUrl =
    new URL("https://api.datamuse.com/words");

  datamuseUrl.searchParams.set(
    "sp",
    `${letter}????`
  );

  datamuseUrl.searchParams.set(
    "max",
    "500"
  );

  const response = await fetch(
    datamuseUrl.toString(),
    {
      headers: {
        "Accept": "application/json",
        "User-Agent":
          "word-chain-cloudflare-worker"
      },

      cf: {
        cacheEverything: true,
        cacheTtl: 3600
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Datamuse API returned ${response.status}`
    );
  }

  const data = await response.json();

  const words = [
    ...new Set(
      data
        .map(item =>
          String(item.word || "")
            .toUpperCase()
        )
        .filter(word =>
          /^[A-Z]{5}$/.test(word) &&
          word.startsWith(
            letter.toUpperCase()
          )
        )
    )
  ];

  return jsonResponse({
    letter: letter.toUpperCase(),
    count: words.length,
    words
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      /*
        英単語検索API
      */
      if (
        url.pathname === "/api/words" &&
        request.method === "GET"
      ) {
        return await getWords(request);
      }

      /*
        GET以外は許可しない
      */
      if (
        url.pathname === "/api/words" &&
        request.method !== "GET"
      ) {
        return jsonResponse(
          {
            error:
              "このAPIではGETのみ使用できます。"
          },
          405
        );
      }

      /*
        存在しないAPI
      */
      if (
        url.pathname.startsWith("/api/")
      ) {
        return jsonResponse(
          {
            error:
              "指定されたAPIは見つかりません。"
          },
          404
        );
      }

      /*
        publicフォルダ内の静的ファイルを表示
        / へのアクセスでは public/index.html が表示される
      */
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);

      /*
        API通信中のエラー
      */
      if (
        url.pathname.startsWith("/api/")
      ) {
        return jsonResponse(
          {
            error:
              "英単語を取得できませんでした。",

            detail:
              error instanceof Error
                ? error.message
                : "Unknown error"
          },
          500
        );
      }

      /*
        静的ファイル表示中のエラー
      */
      return new Response(
        "ページを読み込めませんでした。",
        {
          status: 500,

          headers: {
            "Content-Type":
              "text/plain; charset=UTF-8"
          }
        }
      );
    }
  }
};
