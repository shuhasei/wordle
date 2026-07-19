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

function getFrequency(item) {
  const tags = Array.isArray(item.tags)
    ? item.tags
    : [];

  const frequencyTag = tags.find(tag =>
    String(tag).startsWith("f:")
  );

  if (!frequencyTag) {
    return 0;
  }

  const value = Number(
    String(frequencyTag).replace("f:", "")
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

function filterByLevel(words, level) {
  if (level === "beginner") {
    return words.filter(item =>
      item.frequency >= 3.5
    );
  }

  if (level === "intermediate") {
    return words.filter(item =>
      item.frequency >= 1.5 &&
      item.frequency < 5
    );
  }

  if (level === "advanced") {
    return words.filter(item =>
      item.frequency >= 0 &&
      item.frequency < 2.5
    );
  }

  return words;
}

async function getWords(request) {
  const requestUrl =
    new URL(request.url);

  const letter = (
    requestUrl.searchParams.get("letter") || ""
  )
    .trim()
    .toLowerCase();

  const level = (
    requestUrl.searchParams.get("level") ||
    "beginner"
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

  if (
    ![
      "beginner",
      "intermediate",
      "advanced"
    ].includes(level)
  ) {
    return jsonResponse(
      {
        error:
          "難易度の指定が正しくありません。"
      },
      400
    );
  }

  const datamuseUrl =
    new URL(
      "https://api.datamuse.com/words"
    );

  datamuseUrl.searchParams.set(
    "sp",
    `${letter}????`
  );

  datamuseUrl.searchParams.set(
    "max",
    "1000"
  );

  /*
    f = 単語の使用頻度情報
  */
  datamuseUrl.searchParams.set(
    "md",
    "f"
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

  const data =
    await response.json();

  const normalizedWords =
    data
      .map(item => ({
        word: String(
          item.word || ""
        ).toUpperCase(),

        frequency:
          getFrequency(item)
      }))
      .filter(item =>
        /^[A-Z]{5}$/.test(item.word) &&
        item.word.startsWith(
          letter.toUpperCase()
        )
      );

  const uniqueMap =
    new Map();

  normalizedWords.forEach(item => {
    if (
      !uniqueMap.has(item.word) ||
      uniqueMap.get(item.word).frequency <
        item.frequency
    ) {
      uniqueMap.set(
        item.word,
        item
      );
    }
  });

  const uniqueWords =
    [...uniqueMap.values()];

  let filteredWords =
    filterByLevel(
      uniqueWords,
      level
    );

  /*
    対象レベルの単語が少なすぎるときは、
    ゲームが止まらないように範囲を広げる。
  */
  if (filteredWords.length < 3) {
    filteredWords = uniqueWords;
  }

  filteredWords.sort(
    (a, b) =>
      b.frequency - a.frequency
  );

  return jsonResponse({
    letter:
      letter.toUpperCase(),

    level,

    count:
      filteredWords.length,

    words:
      filteredWords.map(
        item => item.word
      )
  });
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    try {
      if (
        url.pathname === "/api/words" &&
        request.method === "GET"
      ) {
        return await getWords(request);
      }

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

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);

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
