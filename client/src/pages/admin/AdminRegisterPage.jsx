import { useState } from "react";
import { http } from "../../api/http";

export const AdminRegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", setupKey: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [qrCode, setQrCode] = useState("");
  const [otpUrl, setOtpUrl] = useState("");
  const [devCode, setDevCode] = useState("");

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    setQrCode("");
    setOtpUrl("");
    setDevCode("");

    try {
      const { data } = await http.post("/auth/setup-admin", form);
      setStatus({
        type: "success",
        message: data.message || "Admin created. Check Gmail for verification code."
      });
      setQrCode(data.twoFactorSetup?.qrCodeDataUrl || "");
      setOtpUrl(data.twoFactorSetup?.otpauthUrl || "");
      if (data.devVerificationCode) {
        setDevCode(`Dev verification code: ${data.devVerificationCode}`);
      }
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Failed to create admin." });
    }
  };

  return (
    <main className="container">
      <section className="form-card narrow">
        <h1>Admin Register</h1>
        <form onSubmit={submit} className="form-grid">
          <label>
            Name
            <input name="name" value={form.name} onChange={update} required />
          </label>
          <label>
            Gmail
            <input name="email" type="email" value={form.email} onChange={update} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={update} required />
          </label>
          <label>
            Admin Setup Key
            <input name="setupKey" value={form.setupKey} onChange={update} required />
          </label>
          <button type="submit" className="primary-btn">
            Create Admin
          </button>
        </form>

        {status.message ? (
          <p className={status.type === "error" ? "error" : "success"}>{status.message}</p>
        ) : null}
        {devCode ? <p>{devCode}</p> : null}

        {qrCode ? (
          <div className="form-card" style={{ marginTop: "1rem" }}>
            <h2>Authenticator Setup</h2>
            <p>Scan this QR code with Google or Microsoft Authenticator.</p>
            <img src={qrCode} alt="Authenticator QR" style={{ maxWidth: "220px" }} />
            {otpUrl ? (
              <p style={{ wordBreak: "break-all" }}>
                Manual setup URL: {otpUrl}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
};
