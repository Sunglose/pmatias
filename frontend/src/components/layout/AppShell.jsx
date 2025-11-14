// AppShell.jsx
import Layout from "./Layout";
import { Outlet } from "react-router-dom";
export default function AppShell({ title }) {
  return (
    <Layout title={title}>
      <Outlet />
    </Layout>
  );
}
