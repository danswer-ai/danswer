import React, { useEffect, useState } from "react";
import * as Babel from "@babel/standalone";

interface DynamicReactRendererProps {
  code: string;
}
export const DynamicReactRenderer = React.memo(
  ({ code }: DynamicReactRendererProps) => {
    console.log("DynamicReactRenderer called with code:", code);
    const [iframeContent, setIframeContent] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      try {
        // Transpile the code
        const transpiledCode = Babel.transform(code, {
          presets: ["react"],
        }).code;

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
      <div className=" w-full">
        <iframe
          srcDoc={iframeContent}
          sandbox="allow-scripts allow-same-origin"
          className="scale-.9  w-full h-[700px] border border-gray-300 rounded"
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
);

export const ToggleArtifact = ({
  showArtifact,
  toggleArtifact,
}: {
  showArtifact: boolean;
  toggleArtifact: (showArtifact: boolean) => void;
}) => {
  return (
    <div className="bg-white w-full ">
      <div className="flex justify-between items-center">
        <button
          onMouseDown={() => toggleArtifact(!showArtifact)}
          className="bg-neutral-800 border-nuetral-900 text-white font-bold py-1 px-3 rounded transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {showArtifact ? "Hide" : "Show"} React Artifact
        </button>
      </div>
    </div>
  );
};
//

// EXAMPLE COMPONENT
// const `Component` = () => {
//     const containerStyle = {
//       width: '100px',
//       height: '100px',
//       borderRadius: '50%',
//       backgroundColor: 'yellow',
//       display: 'flex',
//       flexDirection: 'column',
//       justifyContent: 'center',
//       alignItems: 'center',
//       position: 'relative',
//     };

//     const eyeStyle = {
//       width: '15px',
//       height: '15px',
//       borderRadius: '50%',
//       backgroundColor: 'black',
//       position: 'absolute',
//       top: '25px',
//     };

//     const mouthStyle = {
//       width: '50px',
//       height: '25px',
//       borderRadius: '0 0 25px 25px',
//       borderBottom: '5px solid black',
//       position: 'absolute',
//       bottom: '20px',
//     };

//     return (
//       <div style={containerStyle}>
//         <div style={{...eyeStyle, left: '20px'}}></div>
//         <div style={{...eyeStyle, right: '20px'}}></div>
//         <div style={mouthStyle}></div>
//       </div>
//     );
