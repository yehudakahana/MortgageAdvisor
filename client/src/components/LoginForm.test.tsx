import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup";
import { AuthProvider } from "../auth/AuthContext";
import LoginForm from "./LoginForm";

function renderLoginForm() {
  return render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}

function submitCredentials(username: string, password: string) {
  fireEvent.change(screen.getByLabelText("שם משתמש"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "התחברות" }));
}

describe("LoginForm", () => {
  it("stores the session after a successful login", async () => {
    server.use(
      http.post("/api/login", () =>
        HttpResponse.json({ token: "test-token", username: "testuser" })
      )
    );

    renderLoginForm();
    submitCredentials("testuser", "testpass");

    await waitFor(() => {
      expect(localStorage.getItem("user_token")).toBe("test-token");
    });
    expect(localStorage.getItem("username")).toBe("testuser");
  });

  it("shows the Hebrew error message on wrong credentials", async () => {
    server.use(
      http.post("/api/login", () =>
        HttpResponse.json({ error: "פרטי ההתחברות שגויים" }, { status: 401 })
      )
    );

    renderLoginForm();
    submitCredentials("testuser", "wrong-password");

    expect(await screen.findByText("שם משתמש או סיסמה שגויים.")).toBeTruthy();
    expect(localStorage.getItem("user_token")).toBeNull();
  });

  it("validates empty fields locally without any network call", async () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole("button", { name: "התחברות" }));

    // No MSW handler is registered here — a fetch would fail the test.
    expect(await screen.findByText("יש להזין שם משתמש וסיסמה.")).toBeTruthy();
  });
});
