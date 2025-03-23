import React from "react";

const HeroHomepage = () => {
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-black overflow-hidden">
              <div className="gradientBlacktoDown"></div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 grid grid-cols-12 gap-0">
        {[...Array(144)].map((_, i) => (
          <div
            key={i}
            className="border-[0.5px] border-[#5e5e5e]"
            style={{ aspectRatio: "1 / 1" }} // Ensures squares
          ></div>
        ))}
      </div>

      {/* Gradient Eclipse */}
      <div className="absolute inset-0 h-[80%] mt-[10%] mx-auto w-[90vw] ">
        <div className="absolute w-[35vw] h-[45vh] bg-blue-900 rounded-full blur-3xl opacity-60 left-0 top-[0]"></div>
        <div className="absolute w-[30vw] h-[45vh] bg-purple-900 rounded-full blur-3xl opacity-60 right-0 bottom-[10vh]"></div>
      </div>

      {/* Hero Content */}
      <div className="relative text-center text-white w-3/5 xl:w-1/2 mx-auto ">
        <h1 className="text-[72px] font-semibold leading-[1.1em]">Protecting Your <br /> Audio Content</h1>
        <p className="mt-2 text-[24px] font-light">
          Protect voice recordings with cutting-edge AI & watermarking
        </p>
        <button className="mt-6 px-6 py-2 text-black bg-white rounded-md text-lg font-medium">
          Learn More
        </button>
      </div>
    </div>
  );
};

export default HeroHomepage;
