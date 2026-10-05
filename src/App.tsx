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
import { JadwalShift } from '@/pages/admin/JadwalShift'
import { LaporanPetugas } from '@/pages/admin/LaporanPetugas'
import { PengajuanLembur } from '@/pages/admin/PengajuanLembur'
import { Rekapitulasi } from '@/pages/admin/Rekapitulasi'
import { HapusDataFoto } from '@/pages/superadmin/HapusDataFoto'
import { KelolaAkun } from '@/pages/superadmin/KelolaAkun'
import { CatatanHarian } from '@/pages/user/CatatanHarian'
import { DashboardUser } from '@/pages/user/Dashboard'
import { JadwalSayaUser } from '@/pages/user/JadwalSaya'
import { LemburUser } from '@/pages/user/Lembur'
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
        <Route path="laporan-petugas" element={<LaporanPetugas />} />
        {/* Alamat lama: bookmark dan notifikasi push yang sudah terkirim */}
        <Route path="log-aktivitas" element={<Navigate to="/admin/laporan-petugas?tab=aktivitas" replace />} />
        <Route path="rekapitulasi" element={<Rekapitulasi />} />
        <Route path="laporan-kendala" element={<Navigate to="/admin/laporan-petugas?tab=kendala" replace />} />
        <Route path="pengajuan-lembur" element={<PengajuanLembur />} />
        <Route path="jadwal-shift" element={<JadwalShift />} />
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
        <Route path="laporan-petugas" element={<LaporanPetugas />} />
        {/* Alamat lama: bookmark dan notifikasi push yang sudah terkirim */}
        <Route path="log-aktivitas" element={<Navigate to="/super-admin/laporan-petugas?tab=aktivitas" replace />} />
        <Route path="rekapitulasi" element={<Rekapitulasi />} />
        <Route path="laporan-kendala" element={<Navigate to="/super-admin/laporan-petugas?tab=kendala" replace />} />
        <Route path="pengajuan-lembur" element={<PengajuanLembur />} />
        <Route path="jadwal-shift" element={<JadwalShift />} />
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
        <Route path="jadwal-saya" element={<JadwalSayaUser />} />
        <Route path="catat-kegiatan" element={<Navigate to="/petugas/catatan-harian" replace />} />
        <Route path="catatan-harian" element={<CatatanHarian />} />
        {/* Alamat lama (bookmark, notifikasi push yang sudah terkirim) */}
        <Route path="logbook" element={<Navigate to="/petugas/catatan-harian?jenis=aktivitas" replace />} />
        <Route path="laporan-kendala" element={<Navigate to="/petugas/catatan-harian?jenis=kendala" replace />} />
        <Route path="rekap-harian" element={<RekapHarian />} />
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
