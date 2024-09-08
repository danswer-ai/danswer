import React, { useEffect, useState } from "react";
import * as Babel from "@babel/standalone";

interface DynamicReactRendererProps {
  code: string;
}
export default function DynamicReactRenderer({
  code,
}: DynamicReactRendererProps) {
  console.log("DynamicReactRenderer called with code:", code);
  const [iframeContent, setIframeContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Transpile the code
      const transpiledCode = Babel.transform(code, {
        presets: ["react"],
      }).code;

      console.log("Transpiled code:", transpiledCode);

      const content = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            </head>
            <body>
              <div id="root"></div>
              <script>
                console.log('Script started');
                ${transpiledCode}
                console.log('Component defined:', Component);
                try {
                  ReactDOM.createRoot(document.getElementById('root')).render(
                    React.createElement(React.StrictMode, null,
                      React.createElement(Component)
                    )
                  );
                  console.log('Render completed');
                } catch (error) {
                  console.error('Render error:', error);
                  document.body.innerHTML += '<div style="color: red;">Render error: ' + error.message + '</div>';
                }
              </script>
            </body>
          </html>
        `;

      console.log("Generated iframe content:", content);
      setIframeContent(content);
    } catch (err) {
      console.error("Error in DynamicReactRenderer:", err);
      setError(`Error rendering component: ${err}`);
    }
  }, [code]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="w-full">
      <iframe
        srcDoc={iframeContent}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-96 border border-gray-300 rounded"
        title="Dynamic React Component"
      />
      <div className="mt-2">
        <button
          onClick={() => console.log("iframe content:", iframeContent)}
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Log iframe content
        </button>
      </div>
    </div>
  );
}
