const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Supabase URL and key must be provided in environment variables"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test the connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("_dummy_query")
      .select("*")
      .limit(1);

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "relation does not exist" which is expected for a dummy query
      console.error("Error connecting to Supabase:", error);
      return false;
    }

    console.log("Successfully connected to Supabase");
    return true;
  } catch (error) {
    console.error("Error connecting to Supabase:", error);
    return false;
  }
};

module.exports = {
  supabase,
  testConnection,
};
