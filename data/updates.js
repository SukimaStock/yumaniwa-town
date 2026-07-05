// ==========================================
// 湯間庭町 / 更新履歴データ
// 新しい更新は、この配列の先頭に追加します。
// ==========================================

var TOWN_UPDATES = [
    // [UPDATES:ADD_NEWEST_HERE]
    {
        date: "2026-07-05",
        title: "レジャーセンターに『雨の日の窓』を設置",
        body: "指で曇りガラスをなぞる、最初の実働筐体が稼働しました。",
        tags: ["leisure-center", "rakugaki", "open"]
    },
    // {
    //     date: "2026-07-04",
    //     title: "更新タイトル",
    //     body: "町に追加したことを短く書きます。",
    //     tags: ["station-plaza"]
    // },
    {
        date: "2026-07-04",
        title: "町の更新台帳を設置",
        body: "note記事、作品、更新履歴を本体から分けました。これからは町の中身だけを追加できます。",
        tags: ["system"]
    },
    {
        date: "2026-06-16",
        title: "湯間庭新報を開設",
        body: "掲示板から、その日ごとに違うnote記事を読めるようになりました。",
        tags: ["shinpo"]
    },
    {
        date: "2026-06-15",
        title: "駅前広場を開放",
        body: "観光案内所、湯間庭新報、湯窓レジャーセンター、灯串横丁、湯窓通り入口を歩けるようになりました。",
        tags: ["station-plaza"]
    }
];

function buildTownUpdateHistoryText(limit) {
    var maxCount = typeof limit === "number" ? limit : 6;
    var entries = TOWN_UPDATES.slice(0, maxCount);

    if (entries.length === 0) {
        return "まだ更新履歴はありません。町は、静かに次の準備をしています。";
    }

    var lines = [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var date = String(entry.date || "").replace(/-/g, ".");
        lines.push(date + "　" + (entry.title || "更新"));
        if (entry.body) lines.push("　" + entry.body);
        if (i < entries.length - 1) lines.push("");
    }
    return lines.join("\n");
}
