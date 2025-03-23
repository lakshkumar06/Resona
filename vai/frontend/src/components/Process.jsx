import React from "react";

const Process = () => {
  return (
    <div className="flex flex-col items-center p-6 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Process Flow</h1>
      <div className="flex text-center space-x-6">
        {/* Speech Input */}
        <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 h-fit">
          <h2 className="text-xl font-semibold">SPEECH</h2>
          <div className="mt-2 bg-gray-700 p-2 rounded">Upload</div>
        </div>

        {/* OAuth Section */}
        <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 h-fit">
          <h2 className="text-xl font-semibold">OAUTH</h2>
          <div className="mt-2 space-y-2">
            <div className="bg-gray-700 p-2 rounded">Login</div>
            <div className="bg-gray-700 p-2 rounded">Sign Up</div>
          </div>
        </div>

        {/* Frontend Section */}
        <div className="  ">
          <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
          <h2 className="text-xl font-semibold">FRONTEND</h2>
          <div className=" gap-4 mt-4 grid grid-cols-2">
            <div className="p-2 bg-gray-700 rounded">Create Watermark</div>
            <div className="p-2 bg-gray-700 rounded">Test Watermark</div>
            </div>
          </div>
          <div className="p-4 border border-gray-700 rounded-lg bg-gray-800 mt-4">
          <h2 className="text-xl font-semibold">BACKEND</h2>

          </div>
          <div className=" w-full max-w-6xl text-center grid grid-cols-2 mt-[20px] gap-4 ">
            {/* Feature Extraction Block */}
            <div className="">
              <div className="mt-4 bg-gray-700 p-2 rounded">Preprocessing</div>
              <div className="mt-4 bg-gray-700 p-2 rounded">Feature Extraction</div>
              <div className="mt-4 bg-gray-700 p-2 rounded">Gaussian Model</div>
              <div className="mt-4 bg-gray-700 p-2 rounded">Storing on Blockchain</div>
            </div>

            {/* Using Model D4s Net */}
            <div className="">
              <div className="mt-4 bg-gray-700 p-2 rounded">Preprocessing</div>
              <div className="mt-4 bg-gray-700 p-2 rounded">Feature Extraction</div>
              <div className="mt-4 bg-gray-700 p-2 rounded">Gaussian Model</div>
            </div>

            {/* Decision Path */}
            
          </div>

        </div>
        <div className=" flex flex-col justify-end">


              <div className="mt-2 bg-gray-700 p-2 rounded">Using Model D4S Net</div>
              <div className="mt-2 bg-gray-700 p-8 rounded w-fit">Yes/No</div>
              <div className="mt-2 bg-gray-700 p-2 rounded">Authentication Fail</div>
            </div>
            <div className=" flex flex-col justify-end">


<div className="mt-2 bg-gray-700 p-8 rounded w-fit">Voice Authenticate</div>
<div className="h-10"> </div>
</div>
      </div>


    </div>
  );
};

export default Process;
