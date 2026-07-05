// ==========================================
// 湯間庭町 / 作品データ
// 新しいゲーム・触れるらくがきは、この配列の先頭に追加します。
//
// status: "open" | "preparing" | "hidden"
// open      : 町に表示し、実際に遊べる
// preparing : 制作中。データは残すが、町にはまだ表示しない
// hidden    : データは残しつつ、町には置かない
//
// launch: "embedded" | "external"
// embedded : 町の共通プレイヤー内で開く。entry に作品の index.html を指定
// external : itch.io など、別タブで開く。url を指定
// ==========================================

var WORKS = [
    // [WORKS:ADD_NEWEST_HERE]
    // {
    //     id: "work-id",
    //     title: "作品名",
    //     venue: "leisure_center" | "tomogushi_alley",
    //     kind: "work" | "game",
    //     status: "preparing",
    //     launch: "embedded",
    //     entry: "./works/work-id/index.html",
    //     url: "",
    //     emptyText: "この作品は準備中です。"
    // },

    // 作品プレイヤーの動作確認用。必要なときだけ status を open に変更してください。
    {
        id: "rakugaki-template-test",
        title: "新しい筐体の見本",
        venue: "leisure_center",
        kind: "work",
        status: "hidden",
        launch: "embedded",
        entry: "./works/_template/index.html",
        emptyText: "この筐体は、次のらくがきのために空けてあります。"
    },
    {
        id: "midnight-cola",
        title: "MIDNIGHT COLA",
        venue: "tomogushi_alley",
        kind: "game",
        status: "preparing",
        launch: "external",
        url: "",
        emptyText: "真夜中の工房は、いま次の仕込みを整えています。"
    },
    {
        id: "yakitori-wars",
        title: "串焼き勝負台：Yakitori Wars",
        venue: "tomogushi_alley",
        kind: "game",
        status: "open",
        launch: "external",
        url: "https://sukimastock.itch.io/yakitori-wars",
        emptyText: "勝負台は準備中です。炭だけが静かに赤くなっています。"
    },
    {
        id: "rainy-window",
        title: "雨の日の窓",
        venue: "leisure_center",
        kind: "work",
        status: "open",
        launch: "embedded",
        entry: "./works/rainy-window/index.html",
        description: "窓についた雨粒を、指でなぞる小さな作品。",
        emptyText: "この筐体は現在調整中です。ガラスの向こうで、雨音だけが聞こえます。"
    },
    {
        id: "unpushable-button",
        title: "絶対に押せないボタン",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        launch: "embedded",
        entry: "./works/unpushable-button/index.html",
        emptyText: "この筐体は現在調整中です。ボタンだけが、こちらを警戒しています。"
    },
    {
        id: "notification-badge",
        title: "通知バッジ増殖",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        launch: "embedded",
        entry: "./works/notification-badge/index.html",
        emptyText: "この筐体は現在調整中です。赤い丸が、まだ眠っています。"
    },
    {
        id: "someone-pedometer",
        title: "誰かの歩数計",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        launch: "embedded",
        entry: "./works/someone-pedometer/index.html",
        emptyText: "この筐体は現在調整中です。小さな数字だけが、ときどき動きます。"
    },
    {
        id: "fast-forward-clock",
        title: "Fast-Forward Clock",
        venue: "leisure_center",
        kind: "work",
        status: "preparing",
        launch: "embedded",
        entry: "./works/fast-forward-clock/index.html",
        emptyText: "この筐体は現在調整中です。針だけが、少し先の時間を見ているようです。"
    }
];

function getWorkById(workId) {
    for (var i = 0; i < WORKS.length; i++) {
        if (WORKS[i] && WORKS[i].id === workId) return WORKS[i];
    }
    return null;
}

function getVisibleWorksForVenue(venue) {
    var result = [];
    for (var i = 0; i < WORKS.length; i++) {
        var work = WORKS[i];
        // 町の一覧には、実際に起動できる作品だけを並べる。
        if (!work || work.venue !== venue || work.status !== "open") continue;
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
            workId: work.id,
            launch: work.launch || (work.url ? "external" : "embedded"),
            entry: work.entry || "",
            url: work.url || "",
            emptyText: work.emptyText || "この作品は、まだ準備中です。"
        });
    }

    return items;
}
