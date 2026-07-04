// ==========================================
// 湯間庭町 / 作品データ
// 新しいゲーム・触れるらくがきは、この配列の先頭に追加します。
// status: "open" | "preparing" | "hidden"
// open      : URLを開く
// preparing : 町には表示し、準備中メッセージを出す
// hidden    : データは残しつつ町には表示しない
// ==========================================

var WORKS = [
    // [WORKS:ADD_NEWEST_HERE]
    // {
    //     id: "work-id",
    //     title: "作品名",
    //     venue: "leisure_center" | "tomogushi_alley",
    //     kind: "work" | "game",
    //     status: "preparing",
    //     url: "",
    //     emptyText: "この作品は準備中です。"
    // },
    {
        id: "midnight-cola",
        title: "MIDNIGHT COLA",
        venue: "tomogushi_alley",
        kind: "game",
        status: "preparing",
        url: "",
        emptyText: "真夜中の工房は、いま次の仕込みを整えています。"
    },
    {
        id: "yakitori-wars",
        title: "串焼き勝負台：Yakitori Wars",
        venue: "tomogushi_alley",
        kind: "game",
        status: "open",
        url: "https://sukimastock.itch.io/yakitori-wars",
        emptyText: "勝負台は準備中です。炭だけが静かに赤くなっています。"
    },
    {
        id: "rainy-window",
        title: "雨の日の窓",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        url: "",
        emptyText: "この筐体は現在調整中です。ガラスの向こうで、雨音だけが聞こえます。"
    },
    {
        id: "unpushable-button",
        title: "絶対に押せないボタン",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        url: "",
        emptyText: "この筐体は現在調整中です。ボタンだけが、こちらを警戒しています。"
    },
    {
        id: "notification-badge",
        title: "通知バッジ増殖",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        url: "",
        emptyText: "この筐体は現在調整中です。赤い丸が、まだ眠っています。"
    },
    {
        id: "someone-pedometer",
        title: "誰かの歩数計",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        url: "",
        emptyText: "この筐体は現在調整中です。小さな数字だけが、ときどき動きます。"
    },
    {
        id: "fast-forward-clock",
        title: "Fast-Forward Clock",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        url: "",
        emptyText: "この筐体は現在調整中です。針だけが、少し先の時間を見ているようです。"
    }
];

function getVisibleWorksForVenue(venue) {
    var result = [];
    for (var i = 0; i < WORKS.length; i++) {
        var work = WORKS[i];
        if (!work || work.venue !== venue || work.status === "hidden") continue;
        result.push(work);
    }
    return result;
}

function buildWorkMenuItems(venue) {
    var works = getVisibleWorksForVenue(venue);
    var items = [];

    for (var i = 0; i < works.length; i++) {
        var work = works[i];
        items.push({
            label: work.title,
            kind: work.kind || "work",
            url: work.status === "open" ? (work.url || "") : "",
            emptyText: work.emptyText || "この作品は、まだ準備中です。"
        });
    }

    return items;
}
