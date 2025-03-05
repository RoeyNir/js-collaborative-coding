import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCodeBlocks } from "../api";
import "./Lobby.css";


function Lobby() {
  const [codeBlocks, setCodeBlocks] = useState([]);

  useEffect(() => {
    const loadCodeBlocks = async () => {
      const blocks = await fetchCodeBlocks();
      setCodeBlocks(blocks);
    };
    loadCodeBlocks();
  }, []);

  return (
    <div>
      <h1>Choose code block</h1>
      <ul>
        {codeBlocks.length > 0 ? (
          codeBlocks.map((block) => (
            <li key={block.id}>
              <Link to={`/code/${block.id}`}>{block.title}</Link>
            </li>
          ))
        ) : (
          <p>Loading code blocks...</p>
        )}
      </ul>
    </div>
  );
}

export default Lobby;
