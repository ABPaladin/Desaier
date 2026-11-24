# Activarea controlată a bazei Desaier

Metoda aleasă: **Supabase CLI 3.3.0**, din rădăcina repository-ului. MCP rămâne read-only. Nu executa migrația și prin SQL Editor, MCP sau automatizarea GitHub. Înainte de pushuri Git, verifică dacă integrarea Supabase are deployment automat activ; nu lansa două procese concurente.

## Starea verificată local

- `supabase init` a creat numai configurația locală, fără proiect cloud sau Docker.
- CLI disponibil și autentificat: `3.3.0`. MCP Supabase nu este încă disponibil în această sesiune; citirile au folosit CLI `--read-only`.
- Țintă verificată: **Desair**, ref `oueolnrsoicnamrkxawc`, organizație `fhajerdziizyqfihlifk`, regiune `eu-west-1`, environment **production**, PostgreSQL 17.12, status `ACTIVE_HEALTHY`. Referința corespunde URL-ului furnizat de proprietar și checkoutului legat local.
- Istoric verificat: versiunea `202611200001` apare numai local; remote gol. Preflight: zero tabele/funcții publice, zero politici Storage, fără triggerul aplicației, fără bucket `deliverables`, fără relația de istoric a migrărilor.
- Dry-run reușit: numai `202611200001_agency.sql`, fără seeds sau roles. **Aplicarea reală așteaptă autorizarea explicită a proprietarului.**
- Migrația unică: `supabase/migrations/202611200001_agency.sql`, versiunea `202611200001`.
- SHA-256 al fișierului local revizuit: `F2FE7522BD71C0FB3FD84D3B20C4B22FF6EF2008F2AABFEF4862BA8F3B8A6CA4`. Hashul identifică octeții locali; CRLF/LF poate produce alt hash după checkout. Recalculează înainte de autorizare.
- Efecte: șapte tabele, șapte politici RLS publice, trei politici Storage, 15 funcții (nouă RPC-uri de lucru + șase funcții auxiliare/trigger), trigger Auth și bucket privat de 20 MB.
- Conturile Auth existente primesc profiluri client. Nu este creat automat un operator. Nu sunt introduse proiecte demo.
- Migrația nu este idempotentă; dacă obiectele există, investighează, nu o reaplica și nu repara forțat istoricul.
- 19 teste locale trec, inclusiv verificarea catalogului și detectarea unui grant UPDATE nepermis. Nicio migrare online efectuată.

## 1. Autentificare și identificare — fără aplicarea migrației

Proprietarul rulează login în terminalul său și finalizează autentificarea; nu trimite tokenul în chat:

```powershell
Set-Location 'C:\Users\alexa\Downloads\Desaier'
npx.cmd --yes supabase@3.3.0 login
npx.cmd --yes supabase@3.3.0 projects list
```

Compară numele, organizația și project ref din listă cu Supabase Dashboard → Project Settings → General și URL-ul `/dashboard/project/<ref>`. Numele Desaier singur nu identifică sigur proiectul. `PROJECT_REF` este un placeholder, nu o valoare de executat.

După identificarea referinței reale:

```powershell
$desaierProjectRef = '<REFERINTA_VERIFICATA>'
npx.cmd --yes supabase@3.3.0 link --project-ref $desaierProjectRef
npx.cmd --yes supabase@3.3.0 migration list --remote=$desaierProjectRef
npx.cmd --yes supabase@3.3.0 db query --remote=$desaierProjectRef --read-only --file supabase/checks/preflight.sql
npx.cmd --yes supabase@3.3.0 db push --remote=$desaierProjectRef --dry-run --skip-vault
```

Verifică și `supabase/.temp/project-ref`, dacă este creat. Dacă CLI cere parola bazei, introdu-o numai în promptul securizat al terminalului; nu o pune în comandă, Git sau chat. Nu rula cu `--debug` în rapoarte publice.

Preflight verifică tabelele/funcțiile publice existente, triggerul Auth, bucketul și politicile Storage, fără date personale. Pentru proiectul gol raportat, istoricul remote trebuie să fie gol, iar dry-run să enumere numai `202611200001_agency.sql`. Orice obiect conflictual, migrație suplimentară sau istoric neașteptat oprește procedura pentru analiză.

În CLI 3.3.0, comenzile fără `--remote` vizează localul. Opțiunea `--yes` de imediat după `npx.cmd` aprobă rularea pachetului npm; nu este confirmarea Supabase pentru schema online. [Referința oficială CLI](https://supabase.com/docs/reference/cli/supabase-db-push).

## 2. Punct obligatoriu de autorizare

Codex prezintă: organizație, nume, ref, branch/environment dacă există, URL proiect, istoric, lista dry-run, migrație și hash recalculat. Proprietarul autorizează explicit aplicarea **acestei migrații pe acest proiect**. Nu considera autorizarea login/link drept autorizare de modificare a schemei.

Numai după autorizare, revalidează ținta/istoricul și execută o singură dată:

```powershell
npx.cmd --yes supabase@3.3.0 db push --remote=$desaierProjectRef --skip-vault
```

În terminalul proprietarului, citește lista și confirmă promptul. Dacă execută Codex în mod neinteractiv după autorizare explicită, adaugă `--yes` **la finalul comenzii Supabase**. Nu folosi `--include-all`, `--include-seed`, `--include-roles`, reset sau migration repair. Configurația Auth/cloud nu se publică prin această comandă.

Dacă procesul este întrerupt sau eșuează, verifică istoricul și catalogul înainte de orice nouă încercare. Nu trece la SQL Editor ca soluție alternativă.

## 3. Verificare după aplicare

```powershell
npx.cmd --yes supabase@3.3.0 migration list --remote=$desaierProjectRef
npx.cmd --yes supabase@3.3.0 db query --remote=$desaierProjectRef --read-only --file supabase/checks/verify_agency.sql
```

Rezultat așteptat: versiunea `202611200001` atât local, cât și remote; `catalog_checks_pass=true`; șapte tabele cu RLS, 15 funcții cu privilegii și search_path corecte, zece politici, trigger Auth și bucket privat corect. Citește expresiile politicilor și investighează orice `additional_policies_to_review`; o politică suplimentară poate lărgi accesul chiar dacă verificările obiectelor așteptate trec.

În Supabase → Database → Schema Visualizer / Table Editor trebuie să apară `profiles`, `projects`, `tasks`, `comments`, `deliveries`, `events`, `ai_runs`. În Database → Migrations trebuie să apară migrația. Verifică separat Storage → deliverables → Private. Verificările de catalog nu înlocuiesc testarea API-urilor cu sesiuni reale pentru fiecare rol.

## 4. Activarea aplicației

Urmează [ONLINE_SETUP.md](ONLINE_SETUP.md), secțiunile 3–6: email confirmation/SMTP, cele trei variabile Vercel obligatorii, redeploy, primul operator și acceptarea reală. Variabilele sunt `APP_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; opțional AI: `OPENAI_API_KEY`, `OPENAI_MODEL`. Nu folosi service_role în frontend.
