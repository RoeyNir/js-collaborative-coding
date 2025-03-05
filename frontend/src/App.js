import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Lobby from "./pages/Lobby";
import CodeBlockPage from "./pages/CodeBlockPage";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Lobby />} />
                <Route path="/code/:id" element={<CodeBlockPage />} />
            </Routes>
        </Router>
    );
}

export default App;
