import { useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { http } from "../../api/http";

const cleanText = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const JournalsPage = () => {
  const [journals, setJournals] = useState([]);
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    http
      .get("/journals")
      .then((res) => setJournals(res.data.journals || []))
      .catch(() => setJournals([]));
  }, []);

  const filteredJournals = useMemo(() => {
    if (!query) return journals;
    return journals.filter((journal) => {
      const title = journal.title || "";
      const about = journal.about || "";
      return `${title} ${about}`.toLowerCase().includes(query);
    });
  }, [journals, query]);
  const truncateToWords = (text, wordLimit) => {
  if (!text) return "";
  
  // Check if text contains HTML
  const hasHTML = /<[^>]+>/.test(text);
  
  if (hasHTML) {
    // For HTML content, extract plain text, count words, then reconstruct
    const plainText = text.replace(/<[^>]+>/g, " ");
    const words = plainText.trim().split(/\s+/);
    if (words.length <= wordLimit) return text;
    
    // Create truncated plain text version
    return words.slice(0, wordLimit).join(" ");
  } else {
    // For plain text
    const words = text.trim().split(/\s+/);
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(" ");
  }
};

  return (
    <main>
      <section className="journals fade-up">
          <h2 className="section-title">Journals</h2>
        <div className="journal-container">
          {query ? <p className="search-meta">Results for "{query}"</p> : null}

          {filteredJournals.map((journal) => (
            <div className="journal-item" key={journal._id}>
              <div className="journal-image">
                {journal.cover_image_url ? (
                  <img src={journal.cover_image_url} alt={journal.title} />
                ) : (
                  <img src="/images/journal1.svg" alt={journal.title} />
                )}
              </div>

              <div className="journal-content-primary">
              <div className="journal-content-indicator">
              <h4>ISSN: 3567-190</h4>
              <p>Open Access</p>
              </div>
                <h3>{journal.title}</h3>

                <div className="journal-buttons">
                  <NavLink to={`/journals/${journal.slug}`} className="btn">
                    View Journal
                  </NavLink>
                  <NavLink to={`/journals/${journal.slug}#current`} className="btn">
                    Current Issue
                  </NavLink>
                </div>
              </div>
            </div>
          ))}

          {!filteredJournals.length ? <p>No journals available yet.</p> : null}
        </div>
      </section>
    </main>
  );
};
