// ================================================================
// DROP THIS INTO YOUR VERCEL UI
// Replace SPACE2_URL with your actual Space 2 URL
// ================================================================

const SPACE2_URL = "https://YOUR-USER-coral-pipeline.hf.space";

/**
 * Call the coral pipeline.
 * @param {File}   imageFile  - the File object from your <input type="file">
 * @param {number} conf       - confidence threshold (default 0.25)
 * @param {number} iou        - IoU threshold (default 0.45)
 * @returns {Promise<Object>} - full pipeline result
 */
export async function analyzeCoral(imageFile, conf = 0.25, iou = 0.45) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const response = await fetch(
    `${SPACE2_URL}/analyze?conf=${conf}&iou=${iou}`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Pipeline error ${response.status}`);
  }

  return await response.json();
}

// ================================================================
// EXAMPLE — React usage
// ================================================================
/*
import { analyzeCoral } from "./coralApi";

const [result, setResult]   = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError]     = useState(null);

async function handleDetect(file) {
  setLoading(true);
  setError(null);
  try {
    const data = await analyzeCoral(file, 0.25, 0.45);

    // Show annotated image (GREEN=healthy, RED=bleached already drawn)
    setResult(data);

    console.log(`Total corals : ${data.summary.total_corals}`);
    console.log(`Healthy      : ${data.summary.healthy_count}`);
    console.log(`Bleached     : ${data.summary.bleached_count}`);

  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}

// In your JSX:
<input type="file" accept="image/*" onChange={e => handleDetect(e.target.files[0])} />
{loading && <p>Analyzing...</p>}
{error   && <p style={{color:"red"}}>{error}</p>}
{result  && (
  <>
    <img src={result.annotated_image} alt="Result" />
    <p>🟢 Healthy: {result.summary.healthy_count}</p>
    <p>🔴 Bleached: {result.summary.bleached_count}</p>
    <p>Total: {result.summary.total_corals}</p>
  </>
)}
*/

// ================================================================
// EXAMPLE — Plain HTML/JS usage
// ================================================================
/*
<input type="file" id="img-input" accept="image/*" />
<button onclick="detect()">Analyze</button>
<img id="result-img" />
<p id="summary"></p>

<script>
async function detect() {
  const file = document.getElementById("img-input").files[0];
  if (!file) return alert("Select an image first");

  const SPACE2_URL = "https://YOUR-USER-coral-pipeline.hf.space";
  const form = new FormData();
  form.append("file", file);

  const res  = await fetch(`${SPACE2_URL}/analyze?conf=0.25`, { method:"POST", body:form });
  const data = await res.json();

  document.getElementById("result-img").src = data.annotated_image;
  document.getElementById("summary").textContent =
    `Total: ${data.summary.total_corals} | Healthy: ${data.summary.healthy_count} | Bleached: ${data.summary.bleached_count}`;
}
</script>
*/
