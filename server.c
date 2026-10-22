/*
 * ScamShield - Online Scam Detection & Web Security Platform
 * Backend HTTP Server (C + Winsock2)
 *
 * Compile: gcc server.c -o server.exe -lws2_32
 * Run:     server.exe
 * Visit:   http://localhost:8080
 *
 * NOTE: This is a rule-based DEMO system for educational purposes only.
 * Results do NOT guarantee actual safety or danger.
 */

#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0600
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

/* ws2_32 linked via -lws2_32 flag (GCC) */

#define PORT 8080
#define BUFFER_SIZE 65536
#define MAX_PATH_LEN 512

/* ─── Utility: lowercase a string in-place ─── */
static void str_lower(char *s) {
    for (; *s; s++) *s = (char)tolower((unsigned char)*s);
}

/* ─── Utility: check if needle exists in haystack (case-insensitive) ─── */
static int str_contains_ci(const char *haystack, const char *needle) {
    char h[4096], n[256];
    strncpy(h, haystack, sizeof(h) - 1); h[sizeof(h)-1] = '\0';
    strncpy(n, needle,   sizeof(n) - 1); n[sizeof(n)-1] = '\0';
    str_lower(h); str_lower(n);
    return strstr(h, n) != NULL;
}

/* ─── URL Phishing Keywords ─── */
static const char *PHISH_KEYWORDS[] = {
    "login", "verify", "secure", "update", "confirm", "account",
    "banking", "paypal", "signin", "password", "credential",
    "free-iphone", "winner", "click-here", "urgent", "suspended",
    "verify-now", "limited-time", "act-now", "prize", "lucky",
    NULL
};

static const char *SUSPICIOUS_TLDS[] = {
    ".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".pw", ".top",
    ".click", ".link", ".download", ".zip", ".review", NULL
};

static const char *TRUSTED_DOMAINS[] = {
    "google.com", "github.com", "microsoft.com", "apple.com",
    "amazon.com", "ibm.com", "cloudflare.com", "mozilla.org",
    "wikipedia.org", "stackoverflow.com", NULL
};

/* ─── Scam Message Keywords ─── */
static const char *SCAM_MSG_KEYWORDS[] = {
    "won a prize", "click the link", "verify your account", "otp",
    "bank account", "urgent action", "free gift", "lottery",
    "you have been selected", "limited offer", "send money",
    "wire transfer", "gift card", "nigerian prince", "inheritance",
    "claim your reward", "100% free", "act immediately",
    "suspended account", "confirm your details", NULL
};

/* ─── Fake Job Keywords ─── */
static const char *FAKE_JOB_KEYWORDS[] = {
    "work from home", "no experience needed", "earn $5000 daily",
    "daily payment", "wire transfer", "western union", "money mule",
    "personal assistant", "processing fees", "advance payment required",
    "100% guaranteed salary", "unlimited income", "be your own boss",
    "easy money", "get rich", "financial freedom", NULL
};

/* ─── JSON escape a string ─── */
static void json_escape(const char *src, char *dst, int dstlen) {
    int j = 0;
    for (int i = 0; src[i] && j < dstlen - 2; i++) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"')       { dst[j++] = '\\'; dst[j++] = '"'; }
        else if (c == '\\') { dst[j++] = '\\'; dst[j++] = '\\'; }
        else if (c == '\n') { dst[j++] = '\\'; dst[j++] = 'n'; }
        else if (c == '\r') { dst[j++] = '\\'; dst[j++] = 'r'; }
        else if (c == '\t') { dst[j++] = '\\'; dst[j++] = 't'; }
        else dst[j++] = (char)c;
    }
    dst[j] = '\0';
}

/* ─── Extract JSON field value ─── */
static int extract_json_field(const char *body, const char *field, char *out, int outlen) {
    char search[256];
    snprintf(search, sizeof(search), "\"%s\"", field);
    const char *p = strstr(body, search);
    if (!p) return 0;
    p += strlen(search);
    while (*p == ' ' || *p == ':' || *p == ' ') p++;
    if (*p != '"') return 0;
    p++;
    int i = 0;
    while (*p && *p != '"' && i < outlen - 1) {
        if (*p == '\\' && *(p+1)) { p++; out[i++] = *p++; }
        else out[i++] = *p++;
    }
    out[i] = '\0';
    return 1;
}

/* ═══════════════════════════════════════════════
   DETECTION LOGIC
   ═══════════════════════════════════════════════ */

typedef struct {
    int   score;       /* 0-100, higher = riskier */
    char  verdict[32]; /* "SAFE" / "SUSPICIOUS" / "DANGEROUS" */
    char  reason[512];
} DetectResult;

static DetectResult check_url(const char *url) {
    DetectResult r = {0, "SAFE", "No obvious phishing indicators found."};
    int hits = 0;
    char reasons[512] = "";

    /* Check for HTTPS */
    if (strncmp(url, "http://", 7) == 0) {
        hits += 10;
        strncat(reasons, "No HTTPS. ", sizeof(reasons) - strlen(reasons) - 1);
    }

    /* Trusted domain shortcut */
    for (int i = 0; TRUSTED_DOMAINS[i]; i++) {
        if (str_contains_ci(url, TRUSTED_DOMAINS[i])) {
            r.score = 5; strcpy(r.verdict, "SAFE");
            snprintf(r.reason, sizeof(r.reason), "Recognized trusted domain (%s).", TRUSTED_DOMAINS[i]);
            return r;
        }
    }

    /* Phishing keywords */
    for (int i = 0; PHISH_KEYWORDS[i]; i++) {
        if (str_contains_ci(url, PHISH_KEYWORDS[i])) {
            hits += 15;
            strncat(reasons, PHISH_KEYWORDS[i], sizeof(reasons) - strlen(reasons) - 2);
            strncat(reasons, " ", sizeof(reasons) - strlen(reasons) - 1);
        }
    }

    /* Suspicious TLDs */
    for (int i = 0; SUSPICIOUS_TLDS[i]; i++) {
        if (str_contains_ci(url, SUSPICIOUS_TLDS[i])) {
            hits += 20;
            strncat(reasons, "Suspicious TLD. ", sizeof(reasons) - strlen(reasons) - 1);
        }
    }

    /* IP address in URL */
    int dots = 0, digits = 0;
    for (int i = 7; url[i] && url[i] != '/' && url[i] != ':'; i++) {
        if (url[i] == '.') dots++;
        else if (isdigit((unsigned char)url[i])) digits++;
    }
    if (dots == 3 && digits >= 4) {
        hits += 25;
        strncat(reasons, "IP address used instead of domain. ", sizeof(reasons) - strlen(reasons) - 1);
    }

    /* Multiple subdomains */
    int subdomain_count = 0;
    for (const char *p = url + 7; *p && *p != '/'; p++) {
        if (*p == '.') subdomain_count++;
    }
    if (subdomain_count > 2) {
        hits += 15;
        strncat(reasons, "Excessive subdomains. ", sizeof(reasons) - strlen(reasons) - 1);
    }

    r.score = hits > 100 ? 100 : hits;
    if (r.score >= 60)      { strcpy(r.verdict, "DANGEROUS");   snprintf(r.reason, sizeof(r.reason), "High risk: %s", reasons); }
    else if (r.score >= 30) { strcpy(r.verdict, "SUSPICIOUS");  snprintf(r.reason, sizeof(r.reason), "Moderate risk: %s", reasons); }
    else                    { strcpy(r.verdict, "SAFE");         snprintf(r.reason, sizeof(r.reason), "Low risk. Minor flags: %s", reasons[0] ? reasons : "none"); }
    return r;
}

static DetectResult check_message(const char *msg) {
    DetectResult r = {0, "SAFE", "No scam patterns detected."};
    int hits = 0;
    char reasons[512] = "";

    for (int i = 0; SCAM_MSG_KEYWORDS[i]; i++) {
        if (str_contains_ci(msg, SCAM_MSG_KEYWORDS[i])) {
            hits += 20;
            strncat(reasons, SCAM_MSG_KEYWORDS[i], sizeof(reasons) - strlen(reasons) - 2);
            strncat(reasons, "; ", sizeof(reasons) - strlen(reasons) - 1);
        }
    }

    /* Urgency caps */
    int caps = 0;
    for (const char *p = msg; *p; p++) if (isupper((unsigned char)*p)) caps++;
    if (caps > 10) { hits += 15; strncat(reasons, "excessive caps; ", sizeof(reasons) - strlen(reasons) - 1); }

    r.score = hits > 100 ? 100 : hits;
    if (r.score >= 60)      { strcpy(r.verdict, "SCAM");         snprintf(r.reason, sizeof(r.reason), "High scam probability: %s", reasons); }
    else if (r.score >= 25) { strcpy(r.verdict, "SUSPICIOUS");   snprintf(r.reason, sizeof(r.reason), "Suspicious message: %s", reasons); }
    else                    { strcpy(r.verdict, "CLEAN");         strcpy(r.reason, "No significant scam patterns found."); }
    return r;
}

static DetectResult check_fake_job(const char *text) {
    DetectResult r = {0, "LEGITIMATE", "No fake-job indicators found."};
    int hits = 0;
    char reasons[512] = "";

    for (int i = 0; FAKE_JOB_KEYWORDS[i]; i++) {
        if (str_contains_ci(text, FAKE_JOB_KEYWORDS[i])) {
            hits += 18;
            strncat(reasons, FAKE_JOB_KEYWORDS[i], sizeof(reasons) - strlen(reasons) - 2);
            strncat(reasons, "; ", sizeof(reasons) - strlen(reasons) - 1);
        }
    }

    r.score = hits > 100 ? 100 : hits;
    if (r.score >= 50)      { strcpy(r.verdict, "FAKE JOB");     snprintf(r.reason, sizeof(r.reason), "Likely fraudulent offer: %s", reasons); }
    else if (r.score >= 25) { strcpy(r.verdict, "SUSPICIOUS");   snprintf(r.reason, sizeof(r.reason), "Some red flags: %s", reasons); }
    else                    { strcpy(r.verdict, "LEGITIMATE");    strcpy(r.reason, "No obvious fake-job indicators."); }
    return r;
}

/* ═══════════════════════════════════════════════
   FILE SERVING
   ═══════════════════════════════════════════════ */

static const char *get_mime(const char *path) {
    if (strstr(path, ".html")) return "text/html; charset=utf-8";
    if (strstr(path, ".css"))  return "text/css; charset=utf-8";
    if (strstr(path, ".js"))   return "application/javascript; charset=utf-8";
    if (strstr(path, ".ico"))  return "image/x-icon";
    return "text/plain";
}

static int send_file(SOCKET client, const char *filepath) {
    FILE *f = fopen(filepath, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    rewind(f);
    char *buf = (char *)malloc(size);
    if (!buf) { fclose(f); return 0; }
    fread(buf, 1, size, f);
    fclose(f);

    char header[512];
    snprintf(header, sizeof(header),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %ld\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Connection: close\r\n\r\n",
        get_mime(filepath), size);
    send(client, header, (int)strlen(header), 0);
    send(client, buf, (int)size, 0);
    free(buf);
    return 1;
}

static void send_json(SOCKET client, const char *json) {
    char header[512];
    snprintf(header, sizeof(header),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        "Content-Length: %d\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Connection: close\r\n\r\n",
        (int)strlen(json));
    send(client, header, (int)strlen(header), 0);
    send(client, json, (int)strlen(json), 0);
}

static void send_404(SOCKET client) {
    const char *msg = "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\nConnection: close\r\n\r\nNot Found";
    send(client, msg, (int)strlen(msg), 0);
}

static void send_options(SOCKET client) {
    const char *msg =
        "HTTP/1.1 204 No Content\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Connection: close\r\n\r\n";
    send(client, msg, (int)strlen(msg), 0);
}

/* ═══════════════════════════════════════════════
   REQUEST HANDLER
   ═══════════════════════════════════════════════ */

static void handle_client(SOCKET client) {
    char *request = (char *)calloc(1, BUFFER_SIZE);
    if (!request) { closesocket(client); return; }

    int bytes = recv(client, request, BUFFER_SIZE - 1, 0);
    if (bytes <= 0) { free(request); closesocket(client); return; }
    request[bytes] = '\0';

    /* Parse method and path */
    char method[16] = "", path[MAX_PATH_LEN] = "";
    sscanf(request, "%15s %511s", method, path);

    /* Handle CORS preflight */
    if (strcmp(method, "OPTIONS") == 0) {
        send_options(client);
        free(request); closesocket(client); return;
    }

    /* Find body (after double CRLF) */
    const char *body = strstr(request, "\r\n\r\n");
    body = body ? body + 4 : "";

    /* ── API Routes ── */
    if (strcmp(method, "POST") == 0 && strcmp(path, "/api/check-url") == 0) {
        char url[2048] = "";
        extract_json_field(body, "url", url, sizeof(url));
        if (!url[0]) { send_json(client, "{\"error\":\"No URL provided\"}"); }
        else {
            DetectResult r = check_url(url);
            char esc_reason[1024], esc_url[4096], resp[4096];
            json_escape(r.reason, esc_reason, sizeof(esc_reason));
            json_escape(url, esc_url, sizeof(esc_url));
            snprintf(resp, sizeof(resp),
                "{\"url\":\"%s\",\"verdict\":\"%s\",\"score\":%d,\"reason\":\"%s\",\"demo\":true}",
                esc_url, r.verdict, r.score, esc_reason);
            send_json(client, resp);
        }
    }
    else if (strcmp(method, "POST") == 0 && strcmp(path, "/api/check-message") == 0) {
        char msg[4096] = "";
        extract_json_field(body, "message", msg, sizeof(msg));
        if (!msg[0]) { send_json(client, "{\"error\":\"No message provided\"}"); }
        else {
            DetectResult r = check_message(msg);
            char esc_reason[1024], esc_msg[4096], resp[8192];
            json_escape(r.reason, esc_reason, sizeof(esc_reason));
            json_escape(msg, esc_msg, sizeof(esc_msg));
            snprintf(resp, sizeof(resp),
                "{\"message\":\"%s\",\"verdict\":\"%s\",\"score\":%d,\"reason\":\"%s\",\"demo\":true}",
                esc_msg, r.verdict, r.score, esc_reason);
            send_json(client, resp);
        }
    }
    else if (strcmp(method, "POST") == 0 && strcmp(path, "/api/check-job") == 0) {
        char text[4096] = "";
        extract_json_field(body, "text", text, sizeof(text));
        if (!text[0]) { send_json(client, "{\"error\":\"No job text provided\"}"); }
        else {
            DetectResult r = check_fake_job(text);
            char esc_reason[1024], esc_text[4096], resp[8192];
            json_escape(r.reason, esc_reason, sizeof(esc_reason));
            json_escape(text, esc_text, sizeof(esc_text));
            snprintf(resp, sizeof(resp),
                "{\"text\":\"%s\",\"verdict\":\"%s\",\"score\":%d,\"reason\":\"%s\",\"demo\":true}",
                esc_text, r.verdict, r.score, esc_reason);
            send_json(client, resp);
        }
    }
    else if (strcmp(method, "GET") == 0) {
        /* Static file serving */
        char filepath[MAX_PATH_LEN + 16];
        if (strcmp(path, "/") == 0 || strcmp(path, "/index.html") == 0)
            snprintf(filepath, sizeof(filepath), "index.html");
        else if (strcmp(path, "/style.css") == 0)
            snprintf(filepath, sizeof(filepath), "style.css");
        else if (strcmp(path, "/app.js") == 0)
            snprintf(filepath, sizeof(filepath), "app.js");
        else {
            send_404(client);
            free(request); closesocket(client); return;
        }

        if (!send_file(client, filepath)) send_404(client);
    }
    else {
        send_404(client);
    }

    free(request);
    closesocket(client);
}

/* ═══════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════ */

int main(void) {
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        fprintf(stderr, "ERROR: WSAStartup failed.\n"); fflush(stderr); return 1;
    }

    SOCKET server = socket(AF_INET, SOCK_STREAM, 0);
    if (server == INVALID_SOCKET) {
        fprintf(stderr, "ERROR: socket() failed: %d\n", WSAGetLastError()); fflush(stderr); return 1;
    }

    int opt = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (char *)&opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(PORT);

    if (bind(server, (struct sockaddr *)&addr, sizeof(addr)) == SOCKET_ERROR) {
        fprintf(stderr, "ERROR: bind() failed (code %d). Is port %d already in use?\n",
                WSAGetLastError(), PORT); fflush(stderr); return 1;
    }
    if (listen(server, 10) == SOCKET_ERROR) {
        fprintf(stderr, "ERROR: listen() failed: %d\n", WSAGetLastError()); fflush(stderr); return 1;
    }

    printf("ScamShield Server running on http://localhost:%d\n", PORT);
    printf("Press Ctrl+C to stop.\n");
    fflush(stdout);

    while (1) {
        struct sockaddr_in client_addr;
        int client_len = sizeof(client_addr);
        SOCKET client = accept(server, (struct sockaddr *)&client_addr, &client_len);
        if (client == INVALID_SOCKET) continue;
        handle_client(client);
    }

    closesocket(server);
    WSACleanup();
    return 0;
}
