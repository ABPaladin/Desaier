# Desaier online — ghid de lansare

Audit: 24 noiembrie 2026. Codul existent folosește **Next.js + Supabase Auth/PostgreSQL/Storage + OpenAI**. Backendul este în `frontend/src/app/api`; Vercel publică și aceste funcții. Nu există Spring Boot, JDBC, Docker sau un server Java de publicat. Nu este necesar Railway/Render pentru arhitectura actuală.

## 1. Conturi și responsabilități

Folosește conturile existente GitHub și Vercel. Ai nevoie de un proiect Supabase, un furnizor SMTP (de exemplu Resend, cu domeniu expeditor verificat) și, pentru activarea AI, un proiect OpenAI API cu acces și buget. Nu au fost create servicii sau activate costuri de către Codex.

Tu alegi/provizionezi proiectul și planul, confirmi domeniul/DNS, introduci secretele în dashboard și stabilești bugetele. Codex poate pregăti codul, migrațiile, testele și commiturile; configurarea conturilor și migrarea cloud necesită acces autorizat la proiectul precis. Conectarea GitHub într-o altă conversație nu oferă automat acces la Supabase/Vercel aici. Nu trimite parole în chat.

## 2. Unde este baza de date și cum o vezi

Deschide [Supabase Dashboard](https://supabase.com/dashboard), selectează proiectul destinat Desaier. Dacă nu există, creează-l numai după alegerea conștientă a planului/regiunii. Fișierul SQL din Git este schema, **nu o bază de date online**. Testele locale folosesc PostgreSQL temporar în memorie; datele lor dispar la oprire.

În proiect:

| Pagina | Ce vezi/faci |
| --- | --- |
| SQL Editor → New query | Rulezi verificări administrative; migrarea inițială se face exclusiv prin CLI |
| Table Editor → schema public | `profiles`, `projects`, `tasks`, `comments`, `deliveries`, `events`, `ai_runs` |
| Authentication → Users | Conturile, emailurile confirmate și UUID-urile |
| Storage → deliverables | Fișierele private; nu transforma bucketul în public |
| Settings → API Keys | Cheia **publishable**, nu secret/service_role |
| Connect / Project URL | URL-ul HTTPS al API-ului Supabase, nu connection string PostgreSQL |

Metoda de activare aleasă de proprietar este acum **CLI oficial, cu autorizare explicită înainte de schema online**. Urmează [DATABASE_ACTIVATION.md](DATABASE_ACTIVATION.md): identificarea proiectului, istoricul, preflight, dry-run, autorizare, db push și verificare. Nu executa migrația prin SQL Editor sau MCP și nu o aplica simultan prin integrarea GitHub. SQL Editor rămâne disponibil pentru citiri administrative și, ulterior, desemnarea autorizată a primului operator.

Verificare administrativă (rezultatul trebuie să includă toate cele șapte tabele cu RLS activ):

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
and tablename in ('profiles','projects','tasks','comments','deliveries','events','ai_runs');
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'deliverables';
```

Bucketul trebuie să fie privat, cu limita de 20 MB. Migrația îl creează și configurează politicile. Aplicația utilizează SDK-ul Supabase și URL-uri semnate, fără chei S3 administrative. Fișierele sunt persistente în Storage, nu pe discul Vercel. Dashboardul administrativ ocolește restricțiile utilizatorilor; verifică permisiunile separat prin aplicație.

## 3. Autentificare și email

În Authentication → Sign In / Providers → Email, activează signup și confirmarea emailului; minimum 12 caractere pentru parolă. În Authentication → URL Configuration, setează Site URL la originea canonică Vercel/domeniul propriu, de exemplu `https://desaier.example`. Autorizează numai callbackurile/originile de care ai nevoie; evită wildcarduri generale. Pentru previewuri folosește un proiect de staging cu propriul Site URL.

În Authentication → Email / Templates, configurează:

```text
Confirm signup: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
Reset password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

Pentru Resend: dashboard → Domains → verifică domeniul prin înregistrările DNS indicate; apoi API Keys → creează o cheie pentru trimitere. În Supabase → Authentication → Email (Notifications) → SMTP Settings: host `smtp.resend.com`, port `465`, username `resend`, password = cheia Resend, sender = adresa de pe domeniul verificat, name = Desaier. Salvează și verifică limitele Auth pentru email/signup. Aceste date SMTP se configurează în **Supabase**, nu în Vercel. [Instrucțiunile oficiale Resend](https://resend.com/docs/send-with-supabase-smtp).

Confirmarea și recuperarea conturilor sunt implementate. Notificările de proiect prin email nu sunt implementate; SMTP Auth nu le adaugă automat. Livrarea emailurilor reale rămâne de testat. [Limitele serviciului implicit Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## 4. Vercel: publicarea frontendului și backendului

Valorile confirmate pentru proiectul actual (25 noiembrie):

| Variabilă Production | Valoare |
| --- | --- |
| `APP_ORIGIN` | `https://desaier-cjyd.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oueolnrsoicnamrkxawc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Copiază cheia **publishable** din proiectul `oueolnrsoicnamrkxawc` → Settings → API Keys; nu secret/service_role |

Nu adăuga slash final la primele două valori. Site URL din Supabase Auth trebuie să fie tot `https://desaier-cjyd.vercel.app`. După salvare în Vercel, redeploy Production; nu este necesară reaplicarea migrației. Health-ul actual este 503 `missing_or_invalid`, deci conectarea aplicației nu este încă finalizată. Cheile AI sunt opționale pentru activarea fluxului de bază.

### Dacă buildul afișează „Invalid backend configuration”

Verifică proiectul **desaier-cjyd**, nu proiectul separat **desaier**; ambele au primit deploymenturi din GitHub. Cele trei variabile trebuie să existe în **Production** pentru deploymentul principal (sau în Preview pentru un deployment Preview). Valorile URL nu trebuie să conțină slash final, ghilimele, spații ori calea `/dashboard/project/...`. Cheia trebuie să fie valoarea publishable `sb_publishable_...` sau legacy anon JWT din proiectul corect; numele ei în aplicație este exact `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, chiar dacă o integrare a creat `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Logurile actualizate numesc fiecare variabilă lipsă/nevalidă și nu afișează valorile. Corectează în dashboard, salvează și redeploy. Nu șterge toate variabilele pentru a obține un build verde: aceasta ar reveni la demo cu accesul real dezactivat. Eroarea de build nu necesită refacerea bazei sau reaplicarea migrației.

Deschide proiectul **existent** din [Vercel Dashboard](https://vercel.com/dashboard):

1. Settings → Git: repository `ABPaladin/Desaier`, production branch `main`.
2. Settings → Build and Deployment: Root Directory `frontend`, framework Next.js, Node 24; instalare `npm ci`, build `npm run build`, output implicit Next.js. Nu folosi static export.
3. Settings → Environment Variables: adaugă valorile de mai jos în Production. Nu folosi date de producție în previewuri necontrolate.
4. Deployments → deploymentul commitului dorit → Redeploy. Modificarea variabilelor nu schimbă deploymenturile deja construite.
5. Verifică status Ready, commitul și domeniul canonic în Settings → Domains. Configurează redirectul domeniilor alternative către acesta.

| Variabilă exactă | Valoare / sursă |
| --- | --- |
| `APP_ORIGIN` | Originea HTTPS canonică, fără slash final sau cale |
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul HTTPS al proiectului, fără slash final |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cheia publishable din Settings → API Keys; cheia legacy anon este acceptată |
| `OPENAI_API_KEY` | Cheia proiectului OpenAI, exclusiv server; opțională până la activarea AI |
| `OPENAI_MODEL` | Modelul disponibil proiectului tău, compatibil Responses API |

Nu sunt necesare `DATABASE_URL`, parole PostgreSQL, chei service_role, `NEXT_PUBLIC_API_URL`, variabile Spring sau un server separat. Browserul apelează `/api/...` pe aceeași origine, iar fișierele merg direct prin URL-uri semnate către Supabase Storage. Nu activa CORS `*` pe API. `APP_ORIGIN` trebuie să coincidă cu domeniul vizitat; altfel mutațiile sunt refuzate cu 403.

Buildul refuză configurația parțială, origini nevalide și chei privilegiate. Fără toate cele trei variabile, un build complet neconfigurat poate afișa marketingul/demo, dar conturile reale sunt dezactivate. O cheie secretă introdusă vreodată într-o variabilă publică trebuie rotită, chiar dacă buildul a eșuat. [Cheile Supabase](https://supabase.com/docs/guides/api/api-keys), [Next.js pe Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [variabilele Vercel](https://vercel.com/docs/environment-variables).

## 5. Primul operator și fluxul real

Înregistrează și confirmă contul proprietarului pe site. În Supabase → Authentication → Users verifică emailul și copiază UUID-ul exact. În SQL Editor:

```sql
update public.profiles p set role = 'operator'
from auth.users u
where p.id = u.id
  and u.id = '<UUID-ul verificat al proprietarului>'
  and u.email_confirmed_at is not null
  and p.active and p.role = 'client'
returning p.id, p.role;
```

Verifică faptul că s-a actualizat exact un rând. Conturile noi sunt clienți indiferent de metadatele signup. Designerul se înregistrează și confirmă emailul; operatorul îl desemnează din People & access înainte să aibă istoric de proiect. Utilizatorii nu își aleg roluri de personal.

## 6. Testele înainte de lansare

Din rădăcina repository-ului, după redeploy:

```powershell
node tests/online-smoke.mjs https://DOMENIUL-TAU
```

Acest test verifică pagina publică, `/api/health`, interzicerea accesului anonim și lipsa cache-ului pe răspunsuri private. `/api/health` verifică **doar configurația**, nu disponibilitatea bazei, emailului, Storage sau AI. `externalServices: not_checked` este intenționat. Un test verde nu reprezintă acceptarea finală.

Folosește conturi de test controlate de tine, în sesiuni separate:

| Integrare | Dovada necesară |
| --- | --- |
| Auth/email | Signup → email primit → confirmare → login; recovery → email → parolă schimbată; logout; sesiune reînnoită după expirare |
| PostgreSQL | Clientul creează un brief real; proiectul apare în Table Editor și persistă după reload/redeploy |
| Roluri | Alt client nu vede proiectul; designerul vede doar atribuirea sa; operatorul atribuie și aprobă; contul suspendat pierde accesul |
| Proiect | Brief → atribuire designer/termen → task → mesaj comun/notă internă → livrare → revizie → aprobare |
| Storage | PDF real încărcat; clientul nu vede draftul; după aprobare îl descarcă; fișierul persistă după redeploy; tipuri/20 MB verificate |
| AI | Operatorul analizează un brief de test aprobat, primește un draft și recomandări; verifici `ai_runs` și usage în OpenAI; fără atribuire automată |

AI consumă API plătit: proprietarul activează cheia/modelul și aprobă un buget înaintea probei reale. Codul are timeout de 30 secunde și cote DB de 10 cereri/operator/oră și 100 global/oră, inclusiv eșecuri. Indisponibilitatea AI nu blochează proiectele. Configurează monitorizare/bugete și în OpenAI; nu presupune că o alertă de buget este un plafon garantat.

## 7. Operare, limitări și diagnostic

Vercel → Logs pentru funcțiile API; Supabase → Logs pentru Auth/Postgres/Storage; Resend → Emails pentru livrare; OpenAI → Usage pentru consum. Nu copia tokenuri, briefuri sau URL-uri semnate în rapoarte publice. Verifică politica de backup și restaurare a planului ales înainte de date reale.

- 503 la health: variabile lipsă/nevalide sau versiune nepublicată. 503 numai după login: verifică migrația/profilul/conexiunea providerului.
- 403 la salvare: compară adresa browserului cu `APP_ORIGIN`, apoi verifică rolul și suspendarea.
- Confirmare nereușită: verifică Site URL, șablonul și expirarea linkului; solicită un link nou.
- Upload nereușit: bucket privat existent, politicile migrației, atribuire activă, MIME și dimensiune.
- Nu există Docker fiindcă această lansare folosește Vercel Functions. Nu folosi `frontend/tests/provider-harness.mjs` online.

Simulările sunt numai în `/demo/*` și harnessul de test. Portofoliul și echipa publică au conținut ilustrativ etichetat. Notificările automate de proiect, realtime, scanarea malware, plățile și înscrierea Academy nu sunt implementate. Modelul actual permite un designer atribuit per proiect. Cerințele suplimentare trebuie reconciliate cu planul original, care nu a fost găsit integral.

**Stare actualizată, 25 noiembrie:** migrația Supabase este aplicată și verificată online; domeniul Vercel este cunoscut. Vercel raportează configurație lipsă/nevalidă, iar modificarea variabilelor necesită acces la dashboard. SMTP/domeniul expeditor, confirmarea emailurilor, primul operator și cheia/modelul OpenAI rămân neconfirmate. Catalogul bazei verificat nu este dovadă că întregul flux online funcționează.

Dezvoltare locală și harta codului: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md). Teste reproductibile: [VERIFICATION.md](VERIFICATION.md). Progres: [MILESTONE.md](MILESTONE.md).
