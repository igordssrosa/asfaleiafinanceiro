import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PricingCalculatorPage } from "./pages/PricingCalculatorPage";
import { ProductsPage } from "./pages/ProductsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { TrashPage } from "./pages/TrashPage";

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/movimentacoes"
          element={<TransactionsPage />}
        />

        <Route
          path="/lixeira"
          element={<TrashPage />}
        />

        <Route
          path="/produtos"
          element={<ProductsPage />}
        />

        <Route
          path="/calculadoras"
          element={<PricingCalculatorPage />}
        />
      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;