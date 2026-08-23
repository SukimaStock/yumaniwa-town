// ==========================================
// 湯間庭町 / 駅前広場レイアウト 2026-08-23
// staging で確定した配置・通行領域・調べる場所を本番へ反映する。
// ==========================================
(function () {
    'use strict';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function findById(items, id) {
        var list = Array.isArray(items) ? items : [];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && String(list[i].id) === String(id)) return list[i];
        }
        return null;
    }

    function removeById(items, id) {
        if (!Array.isArray(items)) return;
        for (var i = items.length - 1; i >= 0; i--) {
            if (items[i] && String(items[i].id) === String(id)) items.splice(i, 1);
        }
    }

    function upsertById(items, item) {
        if (!Array.isArray(items) || !item || !item.id) return;
        for (var i = 0; i < items.length; i++) {
            if (items[i] && String(items[i].id) === String(item.id)) {
                items[i] = clone(item);
                return;
            }
        }
        items.push(clone(item));
    }

    function patchPart(items, id, values) {
        var part = findById(items, id);
        if (!part) return null;
        for (var key in values) {
            if (Object.prototype.hasOwnProperty.call(values, key)) part[key] = values[key];
        }
        return part;
    }

    var FINAL_COLLISION = {
        passableRects: [
            { x: 9, y: 0, w: 6, h: 1 },
            { x: 10, y: 1, w: 4, h: 9 },
            { x: 7, y: 7, w: 3, h: 9 },
            { x: 14, y: 7, w: 3, h: 3 },
            { x: 0, y: 9, w: 7, h: 5 },
            { x: 17, y: 9, w: 7, h: 5 },
            { x: 10, y: 10, w: 3, h: 14 },
            { x: 15, y: 10, w: 2, h: 6 },
            { x: 13, y: 11, w: 2, h: 5 },
            { x: 0, y: 14, w: 1, h: 1 },
            { x: 23, y: 14, w: 1, h: 1 },
            { x: 13, y: 16, w: 1, h: 8 },
            { x: 9, y: 23, w: 1, h: 1 },
            { x: 14, y: 23, w: 1, h: 1 }
        ],
        blockedRects: [
            { x: 0, y: 0, w: 9, h: 7 },
            { x: 15, y: 0, w: 9, h: 7 },
            { x: 9, y: 1, w: 1, h: 6 },
            { x: 14, y: 1, w: 1, h: 6 },
            { x: 0, y: 7, w: 7, h: 2 },
            { x: 17, y: 7, w: 7, h: 2 },
            { x: 13, y: 10, w: 2, h: 1 },
            { x: 1, y: 14, w: 6, h: 10 },
            { x: 17, y: 14, w: 6, h: 10 },
            { x: 0, y: 15, w: 1, h: 9 },
            { x: 23, y: 15, w: 1, h: 9 },
            { x: 7, y: 16, w: 3, h: 7 },
            { x: 14, y: 16, w: 3, h: 7 },
            { x: 7, y: 23, w: 2, h: 1 },
            { x: 15, y: 23, w: 2, h: 1 }
        ],
        blockedPoints: []
    };

    var FINAL_TRIGGERS = [
        {
            id: 'tourist_map',
            label: '観光案内板',
            actionLabel: '調べる',
            area: { x: 13, y: 10, w: 3, h: 1 },
            type: 'inspect',
            target: '',
            text: '駅前広場の観光案内板。'
        },
        {
            id: 'town_update_history_sign',
            label: '町の更新記録',
            actionLabel: '読む',
            area: { x: 7, y: 14, w: 3, h: 2 },
            type: 'menu',
            target: 'town_update_history',
            text: '町の更新記録が、新しい順に並んでいます。'
        },
        {
            id: 'town_feedback_box_trigger',
            label: '町へのおたより',
            actionLabel: '見る',
            area: { x: 10, y: 2, w: 2, h: 4 },
            type: 'menu',
            target: 'town_feedback_box',
            text: '町へのおたよりを入れられるようです。'
        }
    ];

    function disablePartInteraction(part, fallback) {
        if (!part) return;
        var current = part.interaction || fallback || {};
        part.interaction = {
            enabled: false,
            triggerId: '',
            x: Number(current.x) || Number((fallback || {}).x) || 0,
            y: Number(current.y) || Number((fallback || {}).y) || 0,
            w: Math.max(0.001, Number(current.w) || Number((fallback || {}).w) || 0.001),
            h: Math.max(0.001, Number(current.h) || Number((fallback || {}).h) || 0.001)
        };
        delete part.triggerArea;
    }

    function applyFinalStationLayout() {
        var maps = window.TOWN_SCENE_MAPS;
        var station = maps && maps.station_plaza;
        if (!station) return;

        station.passableRects = clone(FINAL_COLLISION.passableRects);
        station.blockedRects = clone(FINAL_COLLISION.blockedRects);
        station.blockedPoints = [];
        window.passableRects = clone(FINAL_COLLISION.passableRects);
        window.blockedRects = clone(FINAL_COLLISION.blockedRects);
        window.blockedPoints = [];

        var props = Array.isArray(station.props)
            ? station.props
            : (Array.isArray(window.stationPlazaProps) ? window.stationPlazaProps : []);
        station.props = props;

        patchPart(props, 'station_notice_board', {
            x: 1.3957145361604741,
            y: 2.765492525451033,
            footY: 9.015492525451034
        });
        patchPart(props, 'station_tourist_map', {
            x: 12.699074074074076,
            y: 7.375,
            footY: 11.125
        });
        patchPart(props, 'station_bench_left', {
            x: 17.817129629629626,
            y: 13.299222406268077,
            footY: 16.73672240626808
        });
        patchPart(props, 'station_bench_right', {
            x: 16.896881747218067,
            y: 5.558154201067677,
            footY: 8.995654201067676
        });
        patchPart(props, 'station_feedback_box_placeholder', {
            x: 9.359674011330714,
            y: 0,
            footY: 3.125
        });
        patchPart(props, 'station_streetLamp_11', {
            x: 0,
            y: 5.797493032549821,
            footY: 8.79749303254982
        });
        patchPart(props, 'station_streetLamp_12', {
            x: 21,
            y: 5.742885313140873,
            footY: 8.742885313140873
        });
        patchPart(props, 'station_update_history_signboard', {
            x: 6.974537037037036,
            y: 14.38894147341852,
            footY: 16.26394147341852
        });

        var tourist = findById(props, 'station_tourist_map');
        var updateSign = findById(props, 'station_update_history_signboard');
        var feedbackBox = findById(props, 'station_feedback_box_placeholder');
        disablePartInteraction(tourist, { x: 0.47111111111111115, y: 0.9, w: 0.5288888888888889, h: 0.1 });
        disablePartInteraction(updateSign, { x: 0.05, y: 0.2, w: 0.9, h: 0.8 });
        disablePartInteraction(feedbackBox, { x: 0.1, y: 0.08, w: 0.8, h: 0.84 });

        station.triggers = Array.isArray(station.triggers) ? station.triggers : [];
        removeById(station.triggers, 'station_plaza_trigger_1');
        removeById(station.triggers, 'station_plaza_trigger_2');
        removeById(station.triggers, 'station_plaza_trigger_3');
        for (var i = 0; i < FINAL_TRIGGERS.length; i++) upsertById(station.triggers, FINAL_TRIGGERS[i]);

        if (Array.isArray(window.triggers)) {
            removeById(window.triggers, 'station_plaza_trigger_1');
            removeById(window.triggers, 'station_plaza_trigger_2');
            removeById(window.triggers, 'station_plaza_trigger_3');
            for (var t = 0; t < FINAL_TRIGGERS.length; t++) upsertById(window.triggers, FINAL_TRIGGERS[t]);
        }

        // 以前パーツ連動だったIDを、独立した調べる場所として扱う。
        if (window.townPartManagedTriggerIds) {
            delete window.townPartManagedTriggerIds.tourist_map;
            delete window.townPartManagedTriggerIds.town_update_history_sign;
            delete window.townPartManagedTriggerIds.town_feedback_box_trigger;
        }

        window.stationPlazaProps = props;
        if (window.YUMANIWA_STATION_PLAZA_PROPS) {
            window.YUMANIWA_STATION_PLAZA_PROPS.props = props;
        }

        if (window.activeTownSceneDef && window.currentScene === 'station_plaza') {
            window.activeTownSceneDef.passableRects = clone(station.passableRects);
            window.activeTownSceneDef.blockedRects = clone(station.blockedRects);
            window.activeTownSceneDef.blockedPoints = [];
            window.activeTownSceneDef.props = props;
            window.activeTownSceneDef.triggers = clone(station.triggers);
        }

        if (window.currentScene === 'station_plaza') {
            if (typeof window.captureTownPartTriggerTemplates === 'function') {
                window.captureTownPartTriggerTemplates(station);
            }
            if (typeof window.initGrid === 'function') {
                window.initGrid();
            }
            if (typeof window.refreshTownPartDerivedData === 'function') {
                window.refreshTownPartDerivedData();
            }
        }
    }

    applyFinalStationLayout();
    window.YUMANIWA_APPLY_STATION_LAYOUT_20260823 = applyFinalStationLayout;
})();
