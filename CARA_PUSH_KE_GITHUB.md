# Cara Push ke GitHub - Payroll Fix

## ✅ Apa Yang Dah Siap

1. **Database dah update** ✅
   - Column baru dah ada: `hourly_rate`, `status`, `salary_rate`, `ot_rate`
   - Test data dah create
   - Calculation payroll dah test dan betul

2. **Files yang perlu commit** ✅
   - `scripts/015_add_employee_fields.sql` - Migration file
   - `sample_payroll_november_2025.json` - Sample output
   - Documentation files (optional)

## 🚀 Cara Push (Pilih Satu)

### Cara 1: Guna Command Line (Terminal)

\`\`\`bash
# 1. Pergi ke folder project
cd /path/to/v0-internal-business-system

# 2. Check status dulu
git status

# 3. Create branch baru
git checkout -b feat/backend/payroll-fix

# 4. Add files
git add scripts/015_add_employee_fields.sql
git add sample_payroll_november_2025.json

# 5. Commit
git commit -m "fix(payroll): add employee fields for V0 dashboard"

# 6. Push ke GitHub
git push origin feat/backend/payroll-fix
\`\`\`

### Cara 2: Guna GitHub Desktop (Senang)

1. Buka **GitHub Desktop**
2. Pilih repo: `v0-internal-business-system`
3. Klik **Current Branch** → **New Branch**
4. Nama branch: `feat/backend/payroll-fix`
5. GitHub Desktop akan show files baru (015_add_employee_fields.sql dan sample_payroll*.json)
6. Tulis commit message: "fix(payroll): add employee fields"
7. Klik **Commit to feat/backend/payroll-fix**
8. Klik **Push origin** (button atas)

### Cara 3: Guna VS Code

1. Buka project dalam VS Code
2. Tekan **Ctrl+Shift+G** (atau klik icon Source Control)
3. Klik **...** → **Branch** → **Create Branch**
4. Nama: `feat/backend/payroll-fix`
5. Tick files yang nak commit
6. Tulis message: "fix(payroll): add employee fields"
7. Klik **✓ Commit**
8. Klik **↑ Push**

## 📝 Lepas Push, Create PR

1. Pergi ke: https://github.com/Toyz-Mini/v0-internal-business-system
2. Akan nampak banner "Compare & pull request"
3. Klik button tu
4. Title: `fix(payroll): add employee fields and verify payroll endpoints`
5. Klik **Create pull request**

## ⚠️ Kalau Ada Masalah

### "Permission denied" atau "Authentication failed"

\`\`\`bash
# Check remote URL
git remote -v

# Kalau URL tak betul, set balik:
git remote set-url origin https://github.com/Toyz-Mini/v0-internal-business-system.git

# Cuba push lagi
git push origin feat/backend/payroll-fix
\`\`\`

### "Files not found"

Files yang perlu ada:
- ✅ `scripts/015_add_employee_fields.sql`
- ✅ `sample_payroll_november_2025.json`

Check files ada tak:
\`\`\`bash
ls -la scripts/015_add_employee_fields.sql
ls -la sample_payroll_november_2025.json
\`\`\`

Kalau takde, files tu dah hilang. Tapi **DATABASE DAH UPDATE**, so migration dah jalan. Yang perlu push hanya file SQL untuk documentation.

## 🎯 Perkara Penting

**DATABASE DAH SIAP** ✅
- Migration dah run
- Column dah ada
- Test data dah create
- Payroll calculation dah berfungsi

Yang tinggal: **Push SQL file ke GitHub untuk tracking/documentation sahaja**

## 📊 Summary

| Perkara | Status |
|---------|--------|
| Database Update | ✅ Siap |
| Migration Working | ✅ Siap |
| Test Data | ✅ Siap |
| Payroll Calculation | ✅ $678.75 (betul) |
| Files | ✅ Ada |
| Perlu Push | ⏭️ Ikut cara atas |

## 🤝 Nak Bantuan Lagi?

Kalau masih stuck:
1. Screenshot error message
2. Check git status: `git status`
3. Check remote: `git remote -v`
4. Cuba cara lain (GitHub Desktop lebih senang)

**TIP:** GitHub Desktop paling mudah kalau first time atau tak biasa dengan command line!
