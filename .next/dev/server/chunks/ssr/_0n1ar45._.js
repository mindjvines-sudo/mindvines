module.exports = [
"[project]/.next-internal/server/app/(public)/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/(public)/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "60d29406a734f56d7d3479a76fcd0663070b547420",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$public$292f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["submitEnquiryAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$public$292f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f28$public$292f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(public)/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/(public)/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$public$292f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(public)/actions.ts [app-rsc] (ecmascript)");
}),
"[project]/.next-internal/server/app/(public)/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/(public)/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f28$public$292f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/(public)/actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/src/app/(public)/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"60d29406a734f56d7d3479a76fcd0663070b547420":{"name":"submitEnquiryAction"}},"src/app/(public)/actions.ts",""] */ __turbopack_context__.s([
    "submitEnquiryAction",
    ()=>submitEnquiryAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$validations$2f$enquiry$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/validations/enquiry.schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$enquiry$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/enquiry.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/rate-limit.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
const CONTACT_RATE_LIMIT = {
    limit: 5,
    windowMs: 10 * 60 * 1000
};
async function submitEnquiryAction(_prev, formData) {
    const validated = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$validations$2f$enquiry$2e$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["enquiryInputSchema"].safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone") || undefined,
        childAge: formData.get("childAge") || undefined,
        message: formData.get("message") || undefined,
        company: formData.get("company") || undefined
    });
    if (!validated.success) {
        // A filled honeypot fails the "company" field's max(0) rule — reported
        // as a generic error rather than tipping off the bot to what happened.
        if (validated.error.flatten().fieldErrors.company) {
            return {
                message: "Something went wrong. Please try again."
            };
        }
        return {
            errors: validated.error.flatten().fieldErrors
        };
    }
    const ip = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])()).get("x-forwarded-for") ?? "unknown";
    const rateLimit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkRateLimit"])(`contact:${ip}`, CONTACT_RATE_LIMIT);
    if (!rateLimit.allowed) {
        return {
            message: "Too many submissions. Please try again later."
        };
    }
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$enquiry$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createEnquiry"])({
            ...validated.data,
            subject: "Website enquiry"
        }, ip);
    } catch (error) {
        console.error("Contact form: failed to save enquiry", error);
        return {
            message: "We couldn’t send your message just now. Please try again or email us."
        };
    }
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    submitEnquiryAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(submitEnquiryAction, "60d29406a734f56d7d3479a76fcd0663070b547420", null);
}),
"[project]/src/lib/constants.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/src/lib/mongodb.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectToDatabase",
    ()=>connectToDatabase
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
;
;
const MONGODB_URI = process.env.MONGODB_URI;
const cache = /*TURBOPACK member replacement*/ __turbopack_context__.g.__mongooseCache ?? {
    conn: null,
    promise: null
};
/*TURBOPACK member replacement*/ __turbopack_context__.g.__mongooseCache = cache;
async function connectToDatabase() {
    if (cache.conn) {
        return cache.conn;
    }
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not set. Add it to your .env.local file.");
    }
    if (!cache.promise) {
        cache.promise = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["default"].connect(MONGODB_URI, {
            bufferCommands: false
        });
    }
    try {
        cache.conn = await cache.promise;
    } catch (error) {
        cache.promise = null;
        throw error;
    }
    return cache.conn;
}
}),
"[project]/src/lib/rate-limit.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkRateLimit",
    ()=>checkRateLimit
]);
;
// Best-effort, single-instance in-memory limiter. Good enough for admin login
// and the public contact form on a single Next.js server; swap for a shared
// store (e.g. Redis) if the app scales to multiple instances.
const buckets = new Map();
function checkRateLimit(key, { limit, windowMs }) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, {
            count: 1,
            resetAt: now + windowMs
        });
        return {
            allowed: true,
            remaining: limit - 1
        };
    }
    if (bucket.count >= limit) {
        return {
            allowed: false,
            remaining: 0
        };
    }
    bucket.count += 1;
    return {
        allowed: true,
        remaining: limit - bucket.count
    };
}
}),
"[project]/src/lib/utils.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/constants.ts [app-rsc] (ecmascript)");
;
function cn(...values) {
    return values.filter(Boolean).join(" ");
}
function slugify(input) {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function getPagination(params) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEFAULT_PAGE_SIZE"]));
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
}),
"[project]/src/models/ContactEnquiry.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ContactEnquiry",
    ()=>ContactEnquiry
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__ = __turbopack_context__.i("[externals]/mongoose [external] (mongoose, cjs, [project]/node_modules/mongoose)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/constants.ts [app-rsc] (ecmascript)");
;
;
const contactEnquirySchema = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["Schema"]({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    subject: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    doctor: {
        type: String,
        trim: true
    },
    // Kept as the visitor's YYYY-MM-DD so it never shifts across time zones.
    preferredDate: {
        type: String,
        trim: true
    },
    childAge: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ENQUIRY_STATUSES"],
        required: true,
        default: "NEW"
    },
    ipAddress: {
        type: String
    }
}, {
    timestamps: true
});
contactEnquirySchema.index({
    status: 1,
    createdAt: -1
});
const ContactEnquiry = __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["models"].ContactEnquiry ?? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$mongoose__$5b$external$5d$__$28$mongoose$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongoose$29$__["model"])("ContactEnquiry", contactEnquirySchema);
}),
"[project]/src/services/enquiry.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "countEnquiriesByStatus",
    ()=>countEnquiriesByStatus,
    "countNewEnquiries",
    ()=>countNewEnquiries,
    "createEnquiry",
    ()=>createEnquiry,
    "deleteEnquiry",
    ()=>deleteEnquiry,
    "getEnquiryById",
    ()=>getEnquiryById,
    "getEnquiryDailyCounts",
    ()=>getEnquiryDailyCounts,
    "getEnquiryInsights",
    ()=>getEnquiryInsights,
    "getEnquiryStats",
    ()=>getEnquiryStats,
    "listEnquiriesAdmin",
    ()=>listEnquiriesAdmin,
    "listRecentEnquiries",
    ()=>listRecentEnquiries,
    "setEnquiryStatus",
    ()=>setEnquiryStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/mongodb.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/models/ContactEnquiry.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-rsc] (ecmascript)");
;
;
;
;
async function createEnquiry(input, ipAddress) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].create({
        name: input.name,
        email: input.email,
        phone: input.phone || undefined,
        // The Contact page form has no subject field; an appointment request
        // is labelled by its department so it reads clearly in the admin list.
        subject: input.subject || (input.department ? `Appointment request: ${input.department}` : undefined),
        department: input.department || undefined,
        doctor: input.doctor || undefined,
        preferredDate: input.preferredDate || undefined,
        childAge: input.childAge || undefined,
        message: input.message ?? "",
        ipAddress
    });
}
async function listEnquiriesAdmin(params) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    const { page, limit, skip } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getPagination"])(params);
    const filter = {};
    if (params.status) filter.status = params.status;
    if (params.search) {
        filter.$or = [
            {
                name: {
                    $regex: params.search,
                    $options: "i"
                }
            },
            {
                email: {
                    $regex: params.search,
                    $options: "i"
                }
            }
        ];
    }
    const [items, count] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].find(filter).sort({
            createdAt: -1
        }).skip(skip).limit(limit).lean(),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments(filter)
    ]);
    return {
        items,
        page,
        limit,
        total: count,
        pages: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["totalPages"])(count, limit)
    };
}
async function getEnquiryById(id) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].findById(id).lean();
}
async function setEnquiryStatus(id, status) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].findByIdAndUpdate(id, {
        status
    }, {
        new: true
    });
}
async function deleteEnquiry(id) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].findByIdAndDelete(id);
}
async function getEnquiryStats() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    const since = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["startOfMonth"])();
    const [newCount, total, totalThisMonth, newThisMonth] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            status: "NEW"
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments(),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            createdAt: {
                $gte: since
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            status: "NEW",
            createdAt: {
                $gte: since
            }
        })
    ]);
    return {
        new: newCount,
        total,
        totalThisMonth,
        newThisMonth
    };
}
async function listRecentEnquiries(limit = 5) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].find().select("name email subject department doctor preferredDate status createdAt").sort({
        createdAt: -1
    }).limit(limit).lean();
}
async function getEnquiryDailyCounts(days = 7) {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    const today = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["startOfDay"])(new Date());
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));
    // Days are grouped and keyed in the server's own time zone. Keying local
    // midnight with toISOString() shifted every day back by one wherever the
    // server runs ahead of UTC.
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].aggregate([
        {
            $match: {
                createdAt: {
                    $gte: rangeStart
                }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt",
                        timezone
                    }
                },
                count: {
                    $sum: 1
                }
            }
        }
    ]);
    const countsByDate = new Map(rows.map((row)=>[
            row._id,
            row.count
        ]));
    const localKey = (date)=>`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return Array.from({
        length: days
    }, (_, i)=>{
        const date = new Date(rangeStart);
        date.setDate(date.getDate() + i);
        const key = localKey(date);
        return {
            date: key,
            count: countsByDate.get(key) ?? 0
        };
    });
}
async function countNewEnquiries() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
        status: "NEW"
    });
}
async function getEnquiryInsights() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    const thisMonth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["startOfMonth"])();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
    const today = new Date().toISOString().slice(0, 10);
    const isAppointment = {
        department: {
            $exists: true,
            $nin: [
                null,
                ""
            ]
        }
    };
    const [byStatusRows, byDepartmentRows, totalThisMonth, totalLastMonth, apptThisMonth, apptLastMonth, upcoming] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].aggregate([
            {
                $group: {
                    _id: "$status",
                    count: {
                        $sum: 1
                    }
                }
            }
        ]),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].aggregate([
            {
                $match: isAppointment
            },
            {
                $group: {
                    _id: "$department",
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    count: -1
                }
            }
        ]),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            createdAt: {
                $gte: thisMonth
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            createdAt: {
                $gte: lastMonth,
                $lt: thisMonth
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            ...isAppointment,
            createdAt: {
                $gte: thisMonth
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            ...isAppointment,
            createdAt: {
                $gte: lastMonth,
                $lt: thisMonth
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].countDocuments({
            preferredDate: {
                $gte: today
            },
            status: {
                $nin: [
                    "RESOLVED",
                    "ARCHIVED"
                ]
            }
        })
    ]);
    return {
        byStatus: Object.fromEntries(byStatusRows.map((row)=>[
                row._id,
                row.count
            ])),
        byDepartment: byDepartmentRows.map((row)=>({
                label: row._id,
                count: row.count
            })),
        totalThisMonth,
        totalLastMonth,
        appointmentsThisMonth: apptThisMonth,
        appointmentsLastMonth: apptLastMonth,
        upcomingAppointments: upcoming
    };
}
async function countEnquiriesByStatus() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["connectToDatabase"])();
    const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$models$2f$ContactEnquiry$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ContactEnquiry"].aggregate([
        {
            $group: {
                _id: "$status",
                count: {
                    $sum: 1
                }
            }
        }
    ]);
    return Object.fromEntries(rows.map((row)=>[
            row._id,
            row.count
        ]));
}
}),
"[project]/src/validations/enquiry.schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "enquiryInputSchema",
    ()=>enquiryInputSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
;
const enquiryInputSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, "Name is required").max(120),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().min(1, "Email is required").email("Enter a valid email address"),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number").optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    subject: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(150).optional(),
    // Appointment details from the Contact page form; all optional so a
    // plain message still goes through.
    department: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(120).optional(),
    doctor: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(120).optional(),
    preferredDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date").optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal("")),
    // The home page "Let's Connect" form asks for the child's age and, like
    // the live site, leaves the message optional.
    childAge: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(20).optional(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().trim().max(2000).optional(),
    // Honeypot: real users never see or fill this field; bots that
    // autofill every input do. Non-empty means "reject silently".
    company: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().max(0, "Spam detected").optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal(""))
});
}),
];

//# sourceMappingURL=_0n1ar45._.js.map