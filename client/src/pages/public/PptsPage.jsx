import { useEffect, useState } from "react";
import { http } from "../../api/http";
import { toDriveViewerUrl } from "../../utils/driveViewer";
import { getPptCoverUrl } from "../../utils/thumbnailHelpers";

export const PptsPage = () => {
  const [ppts, setPpts] = useState([]);

  useEffect(() => {
    http
      .get("/content/ppts")
      .then((res) => setPpts(res.data.ppts || []))
      .catch(() => setPpts([]));
  }, []);

  return (
    <main className="ppt-container">
      <section className="card-section">
        <h2>PPTs</h2>
        <div className="ppt-grid">
          {ppts.map((ppt) => (
            <a
              href={toDriveViewerUrl(ppt.file_url)}
              target="_blank"
              rel="noreferrer"
              className="ppt-card"
              key={ppt._id}
            >
              <div className="ppt-cover">
                {ppt.thumbnail_url ? (
                  <img 
                    src={ppt.thumbnail_url} 
                    alt={ppt.title}
                    className="cover-img"
                  />
                ) : getPptCoverUrl(ppt.file_url) ? (
                  <img 
                    src={getPptCoverUrl(ppt.file_url)} 
                    alt={ppt.title}
                    className="cover-img"
                  />
                ) : (
                  <div className="ppt-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                )}
              </div>
              <h3>{ppt.title}</h3>
              <span className="inline-link">Open</span>
            </a>
          ))}
          {!ppts.length ? <p className="no-content">No PPTs available yet.</p> : null}
        </div>
      </section>
    </main>
  );
};
