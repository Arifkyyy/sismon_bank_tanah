import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { AKAR } from '@/config/menu'
import { useAuth } from '@/context/AuthContext'
import { Login } from '@/pages/Login'
import { Profil } from '@/pages/Profil'
import { SistemDesain } from '@/pages/SistemDesain'
import { DashboardAdmin } from '@/pages/admin/Dashboard'
import { DataUser } from '@/pages/admin/DataUser'
import { LaporanKendalaAdmin } from '@/pages/admin/LaporanKendala'
import { LogAktivitas } from '@/pages/admin/LogAktivitas'
import { PengajuanLembur } from '@/pages/admin/PengajuanLembur'
import { Rekapitulasi } from '@/pages/admin/Rekapitulasi'
import { KerjaWajibPetugas } from '@/pages/admin/KerjaWajibPetugas'
import { HapusDataFoto } from '@/pages/superadmin/HapusDataFoto'
import { KelolaAkun } from '@/pages/superadmin/KelolaAkun'
import { DashboardUser } from '@/pages/user/Dashboard'
import { KerjaWajib } from '@/pages/user/KerjaWajib'
import { LaporanKendalaUser } from '@/pages/user/LaporanKendala'
import { LemburUser } from '@/pages/user/Lembur'
import { LogbookUser } from '@/pages/user/Logbook'
import { RekapHarian } from '@/pages/user/RekapHarian'
import type { Peran } from '@/types'

/** Menahan rute bila peran yang sedang masuk tidak cocok. */
function Penjaga({ izin, children }: { izin: Peran[]; children: ReactNode }) {
  const { peran, memulihkan } = useAuth()
  // Tunggu GET /api/auth/saya selesai agar refresh tidak dilempar ke login.
  if (memulihkan) return null
  if (!peran) return <Navigate to="/masuk" replace />
  if (!izin.includes(peran)) return <Navigate to={AKAR[peran]} replace />
  return <>{children}</>
}

export default function App() {
  const { peran, memulihkan } = useAuth()

  return (
    <Routes>
      <Route path="/masuk" element={<Login />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <Penjaga izin={['admin']}>
            <AppLayout peran="admin" />
          </Penjaga>
        }
      >
        <Route index element={<DashboardAdmin peran="admin" />} />
        <Route path="data-user" element={<DataUser peran="admin" />} />
        <Route path="log-aktivitas" element={<LogAktivitas />} />
        <Route path="rekapitulasi" element={<Rekapitulasi />} />
        <Route path="laporan-kendala" element={<LaporanKendalaAdmin />} />
        <Route path="kerja-wajib-petugas" element={<KerjaWajibPetugas />} />
        <Route path="pengajuan-lembur" element={<PengajuanLembur />} />
        <Route path="profil" element={<Profil />} />
        <Route path="sistem-desain" element={<SistemDesain />} />
      </Route>

      {/* Super admin: seluruh halaman admin + kendali sistem */}
      <Route
        path="/super-admin"
        element={
          <Penjaga izin={['superadmin']}>
            <AppLayout peran="superadmin" />
          </Penjaga>
        }
      >
        <Route index element={<DashboardAdmin peran="superadmin" />} />
        <Route path="data-user" element={<DataUser peran="superadmin" />} />
        <Route path="log-aktivitas" element={<LogAktivitas />} />
        <Route path="rekapitulasi" element={<Rekapitulasi />} />
        <Route path="laporan-kendala" element={<LaporanKendalaAdmin />} />
        <Route path="kerja-wajib-petugas" element={<KerjaWajibPetugas />} />
        <Route path="pengajuan-lembur" element={<PengajuanLembur />} />
        <Route path="kelola-akun" element={<KelolaAkun />} />
        <Route path="hapus-data-foto" element={<HapusDataFoto />} />
        <Route path="profil" element={<Profil />} />
        <Route path="sistem-desain" element={<SistemDesain />} />
      </Route>

      {/* Petugas */}
      <Route
        path="/petugas"
        element={
          <Penjaga izin={['user']}>
            <AppLayout peran="user" />
          </Penjaga>
        }
      >
        <Route index element={<DashboardUser />} />
        <Route path="logbook" element={<LogbookUser />} />
        <Route path="kerja-wajib" element={<KerjaWajib />} />
        <Route path="rekap-harian" element={<RekapHarian />} />
        <Route path="laporan-kendala" element={<LaporanKendalaUser />} />
        <Route path="lembur" element={<LemburUser />} />
        <Route path="profil" element={<Profil />} />
        <Route path="sistem-desain" element={<SistemDesain />} />
      </Route>

      <Route
        path="*"
        element={memulihkan ? null : <Navigate to={peran ? AKAR[peran] : '/masuk'} replace />}
      />
    </Routes>
  )
}
