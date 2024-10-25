"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  LineElement,
} from "chart.js";
import { type ChartJSOrUndefined } from "../../../node_modules/react-chartjs-2/dist/types";
import Katex from "@/components/katex";
import { invoke } from "@tauri-apps/api/core";

ChartJS.register(
  PointElement,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function App() {
  const [g, setGravity] = useState(9.81);
  const [restrictions, setRestrictions] = useState(true);
  const [constants, setConstants] = useState({
    h: 10,
    xM: 10,
    v0: 20,
  });
  const [alpha, setAlpha] = useState(0.7853);
  const [t, setTime] = useState(0.707);
  const [dardo, setDardo] = useState({
    x: 10,
    y: 7.5475,
  });
  const [dardoPlot, setDardoPlot] =
    useState<Awaited<ReturnType<typeof dardoFlow>>>();
  const [monoPos, setMonoPos] = useState(7.5475);

  const chartRef = useRef<ChartJSOrUndefined<"scatter">>(null);

  const dardoFlow = async (alpha: number) => {
    const points = [];
    let t = 0,
      x = 0,
      y = 0;

    while (y >= 0 && x <= constants.xM * 1.5) {
      x = await calcX(constants.v0, alpha, t);
      y = await calcY(constants.v0, alpha, t, g);
      points.push({ x, y });
      t += 0.1;
    }

    return points;
  };

  const calcX = async (v0: number, alpha: number, t: number) =>
    await invoke<number>("calc_x", { v0, alpha, t });
  const calcY = async (v0: number, alpha: number, t: number, g: number) =>
    await invoke<number>("calc_y", { v0, alpha, t, g });

  useEffect(() => {
    (async () => {
      let newAlpha: number;
      let newTime: number;
      if (restrictions) {
        newAlpha = await invoke<number>("atan2", {
          y: constants.h,
          x: constants.xM,
        });
        newTime = await invoke<number>("calc_time", {
          xM: constants.xM,
          v0: constants.v0,
          alpha: newAlpha,
        });
      } else {
        newAlpha = alpha;
        newTime = t;
      }
      const newDardo = {
        x: await calcX(constants.v0, newAlpha, newTime),
        y: await calcY(constants.v0, newAlpha, newTime, g),
      };

      const newMonoPos = await invoke<number>("monkey_y", {
        h: constants.h,
        time: newTime,
        g: g,
      });

      const path = await dardoFlow(newAlpha);

      if (restrictions) {
        setAlpha(newAlpha);
        setTime(newTime);
      }
      setMonoPos(newMonoPos);
      setDardo(newDardo);
      setDardoPlot(path);
    })();
  }, [constants, alpha, t, g]);

  return (
    <div className="m-4 pb-10">
      <Scatter
        ref={chartRef}
        data={{
          datasets: [
            {
              label: "Dardo",
              data: [dardo],
              backgroundColor: "blue",
            },
            {
              label: "Altura inicial del mono",
              data: [
                {
                  x: constants.xM,
                  y: constants.h,
                },
              ],
              backgroundColor: "red",
            },
            {
              label: "Posición del mono",
              data: [
                {
                  x: constants.xM,
                  y: monoPos,
                },
              ],
              backgroundColor: "yellow",
            },
            {
              label: "Camino del dardo",
              data: dardoPlot,
              backgroundColor: "green",
              borderColor: "green",
              pointRadius: 0,
              showLine: true,
            },
          ],
        }}
        options={{
          scales: {
            x: {
              min: 0,
              max: Math.round(constants.xM * 1.5),
            },
            y: {
              min: 0,
              max: Math.round(constants.h * 1.5),
            },
          },
        }}
      />
      <div className="flex gap-4 md:[&_div]:flex-1 [&_div_p]:my-1 max-md:flex-col">
        <div>
          <p>Distancia vertical inicial del mono</p>
          <Slider
            defaultValue={[constants.h]}
            value={[constants.h]}
            max={100}
            min={1}
            step={1}
            onValueChange={(value) =>
              setConstants({ ...constants, h: Number(value) })
            }
          />
        </div>
        <div>
          <p>Distancia horizontal al mono</p>
          <Slider
            defaultValue={[constants.xM]}
            value={[constants.xM]}
            max={100}
            min={1}
            step={1}
            onValueChange={(value) =>
              setConstants((prev) => ({ ...prev, xM: Number(value) }))
            }
          />
        </div>
        <div>
          <p>Velocidad inicial</p>
          <Slider
            defaultValue={[constants.v0]}
            value={[constants.v0]}
            max={100}
            min={1}
            step={1}
            onValueChange={(value) =>
              setConstants((prev) => ({ ...prev, v0: Number(value) }))
            }
          />
        </div>
        {!restrictions && (
          <>
            <div>
              <p>Angulo de tiro</p>
              <Slider
                defaultValue={[alpha]}
                value={[alpha]}
                max={Math.PI}
                min={0}
                step={0.01}
                onValueChange={(value) => setAlpha(Number(value))}
              />
            </div>
            <div>
              <p>Tiempo transcurrido</p>
              <Slider
                defaultValue={[t]}
                value={[t]}
                max={10}
                min={0}
                step={0.01}
                onValueChange={(value) => setTime(Number(value))}
              />
            </div>
            <div>
              <p>Gravedad</p>
              <div className="my-2">
                <Select
                  defaultValue="9.81"
                  onValueChange={(val) => setGravity(Number(val))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gravedades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Planetas</SelectLabel>
                      <SelectItem value="9.81">Tierra</SelectItem>
                      <SelectItem value="1.62">Luna</SelectItem>
                      <SelectItem value="3.73">Marte</SelectItem>
                      <SelectItem value="0.38">Venus</SelectItem>
                      <SelectItem value="0.62">Mercurio</SelectItem>
                      <SelectItem value="24.79">Júpiter</SelectItem>
                      <SelectItem value="10.44">Saturno</SelectItem>
                      <SelectItem value="8.87">Urano</SelectItem>
                      <SelectItem value="11.15">Neptuno</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Slider
                defaultValue={[g]}
                value={[g]}
                max={20}
                min={1}
                step={0.1}
                onValueChange={(value) => {
                  setGravity(Number(value));
                }}
              />
            </div>
          </>
        )}
      </div>
      <Separator orientation="horizontal" className="mt-4 block" />
      <Button
        onClick={() => setRestrictions((prev) => !prev)}
        className="my-4 block"
      >
        {restrictions ? "Liberar restricciones" : "Restringir valores"}
      </Button>
      <Button
        onClick={() => {
          setGravity(9.81);
          setConstants({ h: 10, xM: 10, v0: 20 });
          setAlpha(0.7853);
          setTime(0.707);
          setDardo({ x: 10, y: 7.5475 });
          setMonoPos(7.5475);
        }}
      >
        Reiniciar a valores iniciales
      </Button>
      <Separator orientation="horizontal" className="mt-4" />
      <div className="my-2">
        <h1 className="text-xl font-bold">Datos calculados:</h1>
        <div className="flex gap-8 flex-wrap">
          <Katex math={`v_{0}=${constants.v0}\\frac{m}{s}`} />
          <Katex math={`x_{m}=${constants.xM}m`} />
          <Katex math={`h=${constants.h}m`} />
          <Katex math={`g=${g}\\frac{m}{s^2}`} />
          <Katex
            math={`\\alpha\\approx${((alpha * 180) / Math.PI).toFixed(
              3
            )}^\\circ`}
          />
          <Katex math={`\\text{Tiempo}=${t.toFixed(2)}\\text{s}`} />
        </div>
      </div>
      {Math.abs(dardo.x - constants.xM) > 0.1 &&
      Math.abs(dardo.y - monoPos) > 0.1 ? (
        <h1 className="text-xl font-bold text-red-500">El dardo no alcanza</h1>
      ) : (
        <h1 className="text-xl font-bold text-green-500">
          El dardo alcanza a disparar
        </h1>
      )}
    </div>
  );
}