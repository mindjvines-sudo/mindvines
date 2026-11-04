(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/layout/Header.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Header",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/content.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function Header() {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const toggleRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Stable, so the drawer's open-state effect doesn't re-run on every render.
    const close = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Header.useCallback[close]": ()=>{
            setOpen(false);
            toggleRef.current?.focus();
        }
    }["Header.useCallback[close]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "sticky top-0 z-40 bg-cream",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative mx-auto flex h-[80px] max-w-[1440px] items-center justify-center px-5 lg:h-[126px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            ref: toggleRef,
                            type: "button",
                            onClick: ()=>setOpen(true),
                            "aria-label": "Open menu",
                            "aria-expanded": open,
                            "aria-controls": "site-menu",
                            className: "absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-ink/5 lg:left-[135px]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                "aria-hidden": true,
                                className: "flex w-[32px] flex-col gap-[9px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-[1.5px] w-full bg-ink"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Header.tsx",
                                        lineNumber: 37,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-[1.5px] w-full bg-ink"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Header.tsx",
                                        lineNumber: 38,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "h-[1.5px] w-full bg-ink"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Header.tsx",
                                        lineNumber: 39,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Header.tsx",
                                lineNumber: 36,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Header.tsx",
                            lineNumber: 27,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/",
                            "aria-label": `${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SITE"].name} — home`,
                            className: "shrink-0",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                src: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SITE"].logo.src,
                                alt: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SITE"].name,
                                width: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SITE"].logo.width,
                                height: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SITE"].logo.height,
                                priority: true,
                                className: "h-[54px] w-auto lg:h-[87px]"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Header.tsx",
                                lineNumber: 44,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Header.tsx",
                            lineNumber: 43,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/Header.tsx",
                    lineNumber: 26,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MenuDrawer, {
                open: open,
                onClose: close
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Header.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_s(Header, "rzxzRLiDntsgZ6PqhnDyf3bN/Fw=");
_c = Header;
function MenuDrawer({ open, onClose }) {
    _s1();
    const closeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // While open: Escape closes, the page behind stops scrolling, and focus
    // moves into the panel.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MenuDrawer.useEffect": ()=>{
            if (!open) return;
            closeRef.current?.focus();
            const onKeyDown = {
                "MenuDrawer.useEffect.onKeyDown": (event)=>{
                    if (event.key === "Escape") onClose();
                }
            }["MenuDrawer.useEffect.onKeyDown"];
            const previousOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", onKeyDown);
            return ({
                "MenuDrawer.useEffect": ()=>{
                    document.body.style.overflow = previousOverflow;
                    document.removeEventListener("keydown", onKeyDown);
                }
            })["MenuDrawer.useEffect"];
        }
    }["MenuDrawer.useEffect"], [
        open,
        onClose
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        id: "site-menu",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed inset-0 z-50", !open && "pointer-events-none"),
        inert: !open,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                tabIndex: -1,
                "aria-hidden": true,
                onClick: onClose,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute inset-0 bg-[#e1e1e1]/90 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                "aria-label": "Main menu",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute inset-y-0 left-0 flex w-[min(475px,88vw)] flex-col overflow-y-auto bg-paper font-ui text-ink transition-transform duration-300 ease-out", open ? "translate-x-0" : "-translate-x-full"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        ref: closeRef,
                        type: "button",
                        onClick: onClose,
                        "aria-label": "Close menu",
                        className: "ml-auto mr-[14px] mt-[14px] grid size-12 shrink-0 place-items-center rounded-md transition-colors hover:bg-ink/5",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            viewBox: "0 0 24 24",
                            className: "size-[30px]",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "1.4",
                            "aria-hidden": true,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M4 4l16 16M20 4 4 20",
                                strokeLinecap: "round"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Header.tsx",
                                lineNumber: 109,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Header.tsx",
                            lineNumber: 108,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Header.tsx",
                        lineNumber: 101,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "mt-[22px] pb-10",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$content$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MENU"].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MenuEntry, {
                                item: item,
                                onNavigate: onClose
                            }, item.label, false, {
                                fileName: "[project]/src/components/layout/Header.tsx",
                                lineNumber: 115,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Header.tsx",
                        lineNumber: 113,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Header.tsx",
        lineNumber: 82,
        columnNumber: 5
    }, this);
}
_s1(MenuDrawer, "GT2K607LEp8jm6Vo4w60mdjRd68=");
_c1 = MenuDrawer;
function MenuEntry({ item, onNavigate }) {
    _s2();
    const [expanded, setExpanded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const rowClass = "flex min-h-[97px] w-full items-center gap-1.5 px-[31px] text-left text-[20px] leading-[1.3] transition-colors hover:text-tan";
    if (!item.children) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: item.href,
                onClick: onNavigate,
                className: rowClass,
                children: item.label
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 131,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/layout/Header.tsx",
            lineNumber: 130,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>setExpanded((value)=>!value),
                "aria-expanded": expanded,
                className: rowClass,
                children: [
                    item.label,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        viewBox: "0 0 10 6",
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mt-0.5 h-[6px] w-[10px] transition-transform duration-200", expanded && "rotate-180"),
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "1.4",
                        "aria-hidden": true,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "m1 1 4 4 4-4",
                            strokeLinecap: "round",
                            strokeLinejoin: "round"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Header.tsx",
                            lineNumber: 150,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Header.tsx",
                        lineNumber: 142,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this),
            expanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "-mt-[22px] pb-[18px]",
                children: item.children.map((child)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                            href: child.href,
                            onClick: onNavigate,
                            className: "block px-[47px] py-[10px] text-[17px] font-medium text-[#43311f] transition-colors hover:text-tan",
                            children: child.label
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Header.tsx",
                            lineNumber: 157,
                            columnNumber: 15
                        }, this)
                    }, child.href, false, {
                        fileName: "[project]/src/components/layout/Header.tsx",
                        lineNumber: 156,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Header.tsx",
                lineNumber: 154,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/Header.tsx",
        lineNumber: 139,
        columnNumber: 5
    }, this);
}
_s2(MenuEntry, "DuL5jiiQQFgbn7gBKAyxwS/H4Ek=");
_c2 = MenuEntry;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Header");
__turbopack_context__.k.register(_c1, "MenuDrawer");
__turbopack_context__.k.register(_c2, "MenuEntry");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/constants.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUDIT_ACTIONS",
    ()=>AUDIT_ACTIONS,
    "CONTENT_STATUSES",
    ()=>CONTENT_STATUSES,
    "DEFAULT_PAGE_SIZE",
    ()=>DEFAULT_PAGE_SIZE,
    "ENQUIRY_STATUSES",
    ()=>ENQUIRY_STATUSES,
    "ROLES",
    ()=>ROLES,
    "SESSION_COOKIE_NAME",
    ()=>SESSION_COOKIE_NAME,
    "SESSION_DURATION_MS",
    ()=>SESSION_DURATION_MS
]);
const ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "EDITOR"
];
const CONTENT_STATUSES = [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED"
];
const ENQUIRY_STATUSES = [
    "NEW",
    "CONTACTED",
    "IN_PROGRESS",
    "RESOLVED",
    "ARCHIVED"
];
const AUDIT_ACTIONS = [
    "LOGIN",
    "LOGIN_FAILED",
    "LOGOUT",
    "CREATE",
    "UPDATE",
    "PUBLISH",
    "UNPUBLISH",
    "ARCHIVE",
    "DELETE",
    "MEDIA_UPLOAD",
    "MEDIA_DELETE",
    "USER_CREATE",
    "USER_UPDATE",
    "SETTINGS_UPDATE"
];
const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/content.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AGE_GROUPS",
    ()=>AGE_GROUPS,
    "CONTACT",
    ()=>CONTACT,
    "FAQ",
    ()=>FAQ,
    "FOOTER_LINKS",
    ()=>FOOTER_LINKS,
    "FOUNDER_NOTE",
    ()=>FOUNDER_NOTE,
    "HERO",
    ()=>HERO,
    "JOURNEY",
    ()=>JOURNEY,
    "MENU",
    ()=>MENU,
    "MORE_THAN_JOURNAL",
    ()=>MORE_THAN_JOURNAL,
    "REGISTER_HREF",
    ()=>REGISTER_HREF,
    "SECTION_IDS",
    ()=>SECTION_IDS,
    "SITE",
    ()=>SITE,
    "WHAT_GROWS",
    ()=>WHAT_GROWS
]);
/**
 * Copy and assets for the public site, transcribed from mindvines.in.
 * The site is a single scrolling page; section ids below are the anchors
 * the menu links to.
 */ /** Pages that live on the current Wix site and have no counterpart here yet. */ const LIVE = "https://www.mindvines.in";
const SITE = {
    name: "Mindvines",
    tagline: "A shared journal programme for ages 6-12",
    description: "Mindvines is a shared journal programme for children aged 6-12. Choose a topic, write or sketch your thoughts, and discover how children across India see it differently.",
    url: "https://www.mindvines.in",
    email: "info@mindvines.in",
    phone: "+91-9176001899",
    logo: {
        src: "/images/logo.png",
        width: 518,
        height: 174
    }
};
const SECTION_IDS = {
    howItWorks: "how-it-works",
    ageGroups: "age-groups",
    faq: "faq",
    contact: "contact"
};
const REGISTER_HREF = `${LIVE}/blank-7`;
const MENU = [
    {
        label: "How it Works",
        href: `#${SECTION_IDS.howItWorks}`
    },
    {
        label: "A Glimpse of few topics",
        children: [
            {
                label: "Ages 6-8 yrs",
                href: `${LIVE}/blank-5`
            },
            {
                label: "Ages 9-12 yrs",
                href: `${LIVE}/blank-5-1-1`
            }
        ]
    },
    {
        label: "Subscription plans",
        children: [
            {
                label: "Ages 6-8",
                href: `${LIVE}/blank-5#ages-6-8`
            },
            {
                label: "Ages 9-12",
                href: `${LIVE}/blank-5-1-1#ages-9-12`
            }
        ]
    },
    {
        label: "FAQ",
        href: `#${SECTION_IDS.faq}`
    },
    {
        label: "Contact us",
        href: `#${SECTION_IDS.contact}`
    },
    {
        label: "Registration",
        href: `${LIVE}/blank-6`
    }
];
const HERO = {
    badge: "A shared journal programme for ages 6-12",
    heading: "Children across India, meeting each other",
    accent: "on paper",
    body: "Choose a topic. Write or sketch your thoughts. Discover how children across India see it differently. Or exactly the same.",
    cta: {
        label: "Register your child",
        href: REGISTER_HREF
    },
    image: {
        src: "/images/hero-journal.png",
        width: 1358,
        height: 1069,
        alt: "An orange Mindvines journal linked to children's names in Bengaluru, Ahmedabad, Pune, Jaipur, Delhi, Chennai, Mumbai, Kolkata and Kochi"
    }
};
const JOURNEY = {
    heading: "Journey with Mindvines",
    steps: [
        {
            number: 1,
            title: "Choose a plan",
            body: "And be part of a cohort with children from 3+ cities",
            icon: {
                src: "/images/step-plan.webp",
                width: 394,
                height: 278
            }
        },
        {
            number: 2,
            title: "Pick topics of interest",
            body: "Choose at the time of registration",
            icon: {
                src: "/images/step-topics.webp",
                width: 240,
                height: 186
            }
        },
        {
            number: 3,
            title: "Journal arrives home",
            body: 'Often holding entries. Or be a "Founding Writer" or "Founding Artist" and set the ball rolling on a new topic',
            icon: {
                src: "/images/step-journal.webp",
                width: 296,
                height: 278
            }
        },
        {
            number: 4,
            title: "Add your voice",
            body: "14 days to write, sketch or do both",
            icon: {
                src: "/images/step-voice.webp",
                width: 226,
                height: 256
            }
        },
        {
            number: 5,
            title: "Say something back",
            body: "A note about a peer's page. Cheer them on",
            icon: {
                src: "/images/step-reply.webp",
                width: 292,
                height: 342
            }
        }
    ],
    finale: {
        text: "And it moves on to the next child",
        image: {
            src: "/images/next-child.webp",
            width: 244,
            height: 288
        }
    }
};
const MORE_THAN_JOURNAL = {
    heading: "More than just a journal",
    cohort: {
        title: "Getting to know your cohort",
        body: "Same names, from 3+ cities across India, show up journal after journal.",
        note: "Your child gets a real sense of who's on the other side of the page!",
        image: {
            src: "/images/cohort-map.png",
            width: 634,
            height: 506,
            alt: "Sketch map of children in Mumbai, Delhi, Bengaluru, Kolkata and Kochi"
        }
    },
    perspectives: {
        title: "Wide perspectives for each topic",
        body: "Every entry is a fresh take on the same topic expressed through writing or sketching.",
        accent: "A unique version each time."
    },
    reviewed: {
        title: "Every entry reviewed",
        body: "Our team checks every page before another child sees it",
        image: {
            src: "/images/reviewed-stamp.png",
            width: 158,
            height: 152
        }
    },
    physical: {
        title: "Physical first",
        body: "A real journal your child holds, fills, and passes on.",
        image: {
            src: "/images/physical-first.png",
            width: 464,
            height: 370,
            alt: "A boy reading an orange Mindvines journal at his desk"
        },
        cta: {
            label: "Get started",
            href: REGISTER_HREF
        }
    }
};
const WHAT_GROWS = {
    heading: "What grows along the way",
    subheading: "A little more than writing and drawing",
    items: [
        {
            title: "Finding their own voice",
            body: "With time to pause, think and respond, children practise putting their thoughts into words or sketches, in their own way"
        },
        {
            title: "Seeing things differently",
            body: "One topic can bring many different responses. Seeing what other children create shows them how differently the same thing can be seen."
        },
        {
            title: "Creating for a real audience",
            body: "Their writing and sketches travel to other children who read them, respond to them and sometimes find inspiration in them."
        }
    ]
};
const AGE_GROUPS = {
    heading: "Two age groups",
    groups: [
        {
            title: "Ages 6–8",
            subtitle: "Sketching journals",
            body: "At this age, drawing is a joyful way to explore a shared topic. Let the sketches flow, one topic at a time.",
            href: `${LIVE}/blank-5`,
            image: {
                src: "/images/ages-6-8.png",
                width: 736,
                height: 724,
                alt: "A child colouring with a red pencil"
            }
        },
        {
            title: "Ages 9–12",
            subtitle: "Writing and Sketching journals",
            body: "Choose writing journals, sketching journals, or both. Every journal revolves around one shared topic.",
            href: `${LIVE}/blank-5-1-1`,
            image: {
                src: "/images/ages-9-12.png",
                width: 728,
                height: 690,
                alt: "A child writing in a lined journal"
            }
        }
    ]
};
const FOUNDER_NOTE = {
    heading: "Founder's Note",
    paragraphs: [
        [
            {
                text: "When I was a child, I was intrigued by the idea of a pen pal. Exchanging little pieces of your world with someone you have never met. There was something quietly magical about it. A faraway stranger reading your thoughts. You reading theirs. No two people seeing the same thing the same way."
            }
        ],
        [
            {
                text: "As a parent, I began wondering: "
            },
            {
                text: "could we bring some of that magic into the lives of our children?",
                accent: true
            }
        ],
        [
            {
                text: "The internet makes it easy to connect with anyone instantly. But, is faster always better, especially for children? Maybe some of what made a pen pal special wasn't the speed, but the exact opposite of it; "
            },
            {
                text: "a friendship blossoming slowly, pausing and reflecting before expressing, and the excitement of discovering how someone in another part of the country thinks.",
                accent: true
            }
        ],
        [
            {
                text: "That thought became Mindvines, a name my 11-year-old daughter suggested, because ideas, like vines, grow by reaching toward one another."
            }
        ],
        [
            {
                text: "We tested the idea with a small group of children. Their responses surprised us, challenged some of our assumptions and helped us reshape the programme."
            }
        ],
        [
            {
                text: "We don’t know which topics will spark the biggest discussions, which sketches will inspire new ones, or which connections will emerge along the way."
            }
        ],
        [
            {
                text: "And that’s the part I’m most looking forward to."
            }
        ]
    ],
    signOff: [
        [
            {
                text: "Every child contributes. Every journal takes a journey.",
                accent: true
            }
        ],
        [
            {
                text: "And every stop adds a story.",
                accent: true,
                italic: true
            }
        ]
    ],
    author: {
        name: "Jitha Muralikrishnan",
        role: "Founder - Mindvines"
    }
};
const FAQ = {
    heading: "Common Questions",
    items: [
        {
            question: "What exactly is Mindvines?",
            answer: "Mindvines is a shared journal programme where physical journals, each centred on a unique topic for writing or sketching, travel from child to child. Children see what others have written or drawn, add their own contribution, and then the journal moves on to another child. Over time, a single journal becomes a collection of different voices or sketches on the same topic."
        },
        {
            question: "Which age groups can join?",
            answer: "There are two age groups - 6 to 8 years and 9 to 12 years. Right on the boundary? Go with whichever feels like the better fit for your child. 6 - 8 years can opt for Sketching alone, while 9-12 years can choose Writing, Sketching or both."
        },
        {
            question: "How does the subscription work, and what's included?",
            answer: "Mindvines offers subscription plans for ages 6 to 12. Each journal arrives with previous entries on that topic already printed inside, plus blank A5 sheets for your child to write or sketch on. Doorstep pickup and delivery happen every 15 days, at no extra cost."
        },
        {
            question: "Who picks the topics?",
            answer: "Your child does! At registration, your child selects 10 preferred topics from the list. Six topics will be sent during the quarter, while the remaining preferences are carried forward, along with an updated set of topics to choose from."
        },
        {
            question: "Will every topic already have entries in it when my child receives the journal?",
            answer: 'Often, yes — but not always. Sometimes your child will be among the first to write on a topic, which comes with its own kind of fun. Kids who start a new topic are called "Founding Writers" or "Founding Artists."'
        },
        {
            question: "What if my child wants to revisit a topic to read new entries or peer comments?",
            answer: "Just send us a WhatsApp message and we'll deliver that topic's journal alongside the next set. One extra journal can be requested per cycle, and it's collected back at the next delivery — free for the first year."
        },
        {
            question: "How is my child's work shared?",
            answer: "Your child signs their entries with a nickname chosen at registration. Every entry is reviewed by our team before it reaches another child, and it is shared within your child's own cohort."
        },
        {
            question: "What if my child accidentally damages the journal?",
            answer: "We've got it covered. There's no cost to you for now. If this ever changes, we'll let every family know clearly in advance."
        }
    ]
};
const CONTACT = {
    heading: "Get in Touch!",
    formHeading: "Let's Connect",
    form: {
        name: "First name",
        childAge: "Child's age",
        email: "Email",
        phone: "Phone",
        message: "Message",
        submit: "Submit",
        success: "Thanks for submitting! We'll be in touch soon."
    }
};
const FOOTER_LINKS = [
    {
        label: "Terms and Conditions",
        href: `${LIVE}/blank-3`
    },
    {
        label: "Refund and Cancellation Policy",
        href: `${LIVE}/blank-2`
    },
    {
        label: "Privacy Policy",
        href: `${LIVE}/blank-4`
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "formatBytes",
    ()=>formatBytes,
    "formatPostDate",
    ()=>formatPostDate,
    "getPagination",
    ()=>getPagination,
    "slugify",
    ()=>slugify,
    "startOfDay",
    ()=>startOfDay,
    "startOfMonth",
    ()=>startOfMonth,
    "toDateTimeAttr",
    ()=>toDateTimeAttr,
    "totalPages",
    ()=>totalPages
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/constants.ts [app-client] (ecmascript)");
;
function cn(...values) {
    return values.filter(Boolean).join(" ");
}
function slugify(input) {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function getPagination(params) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_PAGE_SIZE"]));
    const skip = (page - 1) * limit;
    return {
        page,
        limit,
        skip
    };
}
function totalPages(totalItems, limit) {
    return Math.max(1, Math.ceil(totalItems / limit));
}
function startOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}
function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = [
        "KB",
        "MB",
        "GB"
    ];
    let value = bytes / 1024;
    let unitIndex = 0;
    while(value >= 1024 && unitIndex < units.length - 1){
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
}
function formatPostDate(value, style = "long") {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
        month: style === "long" ? "long" : "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}
function toDateTimeAttr(value) {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_1g4u7gj._.js.map